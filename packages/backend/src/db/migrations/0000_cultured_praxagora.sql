DO $$ BEGIN
 CREATE TYPE "competition_status" AS ENUM('Pending', 'Active', 'Completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "competition_types" AS ENUM('Individual', 'Team');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "provider_providers" AS ENUM('Google', 'Github', 'Email', 'Discord');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "roles" AS ENUM('Admin', 'User');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "submission_status" AS ENUM('Pending', 'Accepted', 'Rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "competitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar,
	"description" text,
	"start" timestamp,
	"end" timestamp,
	"type" competition_types DEFAULT 'Team' NOT NULL,
	"status" competition_status DEFAULT 'Pending' NOT NULL,
	"languages" text[]
);

CREATE TABLE IF NOT EXISTS "providers" (
	"provider" provider_providers NOT NULL,
	"provider_id" varchar NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires" text
);
--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_user_id_provider" PRIMARY KEY("user_id","provider");

CREATE TABLE IF NOT EXISTS "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"title" varchar NOT NULL,
	"question" text NOT NULL,
	"stdin" text NOT NULL,
	"answer" text NOT NULL,
	"points" integer
);

CREATE TABLE IF NOT EXISTS "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"status" submission_status DEFAULT 'Pending' NOT NULL,
	"submission" text[] NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"time" timestamp NOT NULL,
	"result" text,
	"error" text,
	"language" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "team_members" (
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_user_id" PRIMARY KEY("team_id","user_id");

CREATE TABLE IF NOT EXISTS "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"competition_id" uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar NOT NULL,
	"roles" roles[] DEFAULT '{User}' NOT NULL
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
