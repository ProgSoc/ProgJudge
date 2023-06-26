DO $$ BEGIN
 CREATE TYPE "provider" AS ENUM('Google', 'Github', 'Local', 'Discord');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "roles" AS ENUM('Admin', 'User');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "submissions_result_status" AS ENUM('Pending', 'PipelineFailed', 'CompileError', 'RuntimeError', 'OutcomeFailed', 'Passed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "script_run_error_kind" AS ENUM('CompileError', 'RuntimeError', 'TimeoutError', 'ParsingOutputError', 'FailedToInstallLanguageError', 'DependentScriptError');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "script_run_status" AS ENUM('Queued', 'Executing', 'Success', 'Error');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "providers" (
	"provider" provider NOT NULL,
	"provider_id" varchar NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires" text,
	"password" text
);
--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_user_id_provider" PRIMARY KEY("user_id","provider");

CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar NOT NULL,
	"roles" roles[] DEFAULT '{User}' NOT NULL
);

CREATE TABLE IF NOT EXISTS "competitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar
);

CREATE TABLE IF NOT EXISTS "question_test_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_version_id" uuid NOT NULL,
	"name" varchar NOT NULL,
	"display_name" varchar NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"file_id" uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS "question_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"pipeline_config" jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"name" varchar NOT NULL,
	"display_name" varchar NOT NULL,
	"description" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "submission_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"question_version_id" uuid NOT NULL,
	"status" submissions_result_status DEFAULT 'Pending' NOT NULL
);

CREATE TABLE IF NOT EXISTS "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"status" submissions_result_status DEFAULT 'Pending',
	"file" uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS "teamMembers" (
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teamMembers" ADD CONSTRAINT "teamMembers_team_id_user_id" PRIMARY KEY("team_id","user_id");

CREATE TABLE IF NOT EXISTS "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"display_name" varchar NOT NULL,
	"competition_id" uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS "executable_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"runtime" varchar NOT NULL
);

CREATE TABLE IF NOT EXISTS "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hash" varchar NOT NULL,
	"filename" varchar NOT NULL,
	"size" integer NOT NULL,
	"mimetype" varchar NOT NULL,
	"ref" varchar NOT NULL,
	"question_id" uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS "pipelineScriptRuns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"composite_id" json PRIMARY KEY NOT NULL,
	"run_status" script_run_status DEFAULT 'Queued' NOT NULL,
	"error_kind" script_run_error_kind,
	"output_file" uuid,
	"question_id" uuid NOT NULL,
	"submission_result_id" uuid,
	"executable_id" uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS "pipeline_scripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"executable_file_id" uuid NOT NULL,
	"question_version_id" uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS "scriptRunDependency" (
	"run_id" uuid NOT NULL,
	"previous_run_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scriptRunDependency" ADD CONSTRAINT "scriptRunDependency_run_id_previous_run_id" PRIMARY KEY("run_id","previous_run_id");

CREATE UNIQUE INDEX IF NOT EXISTS "username_index" ON "users" ("username");
CREATE UNIQUE INDEX IF NOT EXISTS "competition_team" ON "teams" ("competition_id","name");
CREATE UNIQUE INDEX IF NOT EXISTS "composite_id_index" ON "pipelineScriptRuns" ("composite_id");
DO $$ BEGIN
 ALTER TABLE "providers" ADD CONSTRAINT "providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "question_test_cases" ADD CONSTRAINT "question_test_cases_question_version_id_question_versions_id_fk" FOREIGN KEY ("question_version_id") REFERENCES "question_versions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "question_test_cases" ADD CONSTRAINT "question_test_cases_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "questions" ADD CONSTRAINT "questions_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "submission_results" ADD CONSTRAINT "submission_results_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "submission_results" ADD CONSTRAINT "submission_results_question_version_id_question_versions_id_fk" FOREIGN KEY ("question_version_id") REFERENCES "question_versions"("id") ON DELETE no action ON UPDATE no action;
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
 ALTER TABLE "submissions" ADD CONSTRAINT "submissions_file_executable_files_file_id_fk" FOREIGN KEY ("file") REFERENCES "executable_files"("file_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "teamMembers" ADD CONSTRAINT "teamMembers_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "teamMembers" ADD CONSTRAINT "teamMembers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "teams" ADD CONSTRAINT "teams_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "executable_files" ADD CONSTRAINT "executable_files_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "files" ADD CONSTRAINT "files_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "pipelineScriptRuns" ADD CONSTRAINT "pipelineScriptRuns_output_file_files_id_fk" FOREIGN KEY ("output_file") REFERENCES "files"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "pipelineScriptRuns" ADD CONSTRAINT "pipelineScriptRuns_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "pipelineScriptRuns" ADD CONSTRAINT "pipelineScriptRuns_submission_result_id_submission_results_id_fk" FOREIGN KEY ("submission_result_id") REFERENCES "submission_results"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "pipelineScriptRuns" ADD CONSTRAINT "pipelineScriptRuns_executable_id_executable_files_id_fk" FOREIGN KEY ("executable_id") REFERENCES "executable_files"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "pipeline_scripts" ADD CONSTRAINT "pipeline_scripts_executable_file_id_executable_files_id_fk" FOREIGN KEY ("executable_file_id") REFERENCES "executable_files"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "pipeline_scripts" ADD CONSTRAINT "pipeline_scripts_question_version_id_question_versions_id_fk" FOREIGN KEY ("question_version_id") REFERENCES "question_versions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "scriptRunDependency" ADD CONSTRAINT "scriptRunDependency_run_id_pipelineScriptRuns_id_fk" FOREIGN KEY ("run_id") REFERENCES "pipelineScriptRuns"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "scriptRunDependency" ADD CONSTRAINT "scriptRunDependency_previous_run_id_pipelineScriptRuns_id_fk" FOREIGN KEY ("previous_run_id") REFERENCES "pipelineScriptRuns"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
