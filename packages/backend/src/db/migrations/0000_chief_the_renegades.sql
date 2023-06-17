CREATE TABLE IF NOT EXISTS "competitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar,
	"description" text,
	"start" timestamp,
	"end" timestamp,
	"type" text,
	"status" text,
	"languages" text[]
);

CREATE TABLE IF NOT EXISTS "providers" (
	"provider" text,
	"provider_id" varchar,
	"user_id" serial NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires" text
);
--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_user_id_provider" PRIMARY KEY("user_id","provider");

CREATE TABLE IF NOT EXISTS "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"competition_id" integer NOT NULL,
	"title" varchar NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"points" integer
);

CREATE TABLE IF NOT EXISTS "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"status" text,
	"submission" text[],
	"points" integer,
	"time" timestamp
);

CREATE TABLE IF NOT EXISTS "team_members" (
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_user_id" PRIMARY KEY("team_id","user_id");

CREATE TABLE IF NOT EXISTS "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar,
	"competition_id" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar NOT NULL,
	"role" text
);

CREATE UNIQUE INDEX IF NOT EXISTS "usernameIndex" ON "users" ("username");
DO $$ BEGIN
 ALTER TABLE "providers" ADD CONSTRAINT "providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "questions" ADD CONSTRAINT "questions_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "submissions" ADD CONSTRAINT "submissions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "submissions" ADD CONSTRAINT "submissions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "teams" ADD CONSTRAINT "teams_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
