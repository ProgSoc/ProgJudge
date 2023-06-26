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
 CREATE TYPE "script_run_status" AS ENUM('Queued', 'Executing', 'Success', 'Error', 'Timeout');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "providers" (
	"provider" provider NOT NULL,
	"providerId" varchar NOT NULL,
	"userId" uuid NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"accessTokenExpires" text,
	"password" text
);
--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_userId_provider" PRIMARY KEY("userId","provider");

CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar NOT NULL,
	"roles" roles[] DEFAULT '{User}' NOT NULL
);

CREATE TABLE IF NOT EXISTS "competitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar
);

CREATE TABLE IF NOT EXISTS "questionInputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questionId" uuid NOT NULL,
	"name" varchar NOT NULL,
	"displayName" varchar NOT NULL,
	"file" uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS "questionVersions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questionId" uuid NOT NULL,
	"pipelineConfig" jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competitionId" uuid NOT NULL,
	"name" varchar NOT NULL,
	"displayName" varchar NOT NULL,
	"description" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "submissionResults" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submissionId" uuid NOT NULL,
	"questionVersionId" uuid NOT NULL,
	"status" submissions_result_status DEFAULT 'Pending' NOT NULL
);

CREATE TABLE IF NOT EXISTS "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questionId" uuid NOT NULL,
	"teamId" uuid NOT NULL,
	"status" submissions_result_status DEFAULT 'Pending',
	"file" uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS "teamMembers" (
	"teamId" uuid NOT NULL,
	"userId" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teamMembers" ADD CONSTRAINT "teamMembers_teamId_userId" PRIMARY KEY("teamId","userId");

CREATE TABLE IF NOT EXISTS "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"displayName" varchar NOT NULL,
	"competitionId" uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS "executableFiles" (
	"fileId" uuid PRIMARY KEY NOT NULL,
	"runtime" varchar NOT NULL
);

CREATE TABLE IF NOT EXISTS "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hash" varchar NOT NULL,
	"filename" varchar NOT NULL,
	"size" integer NOT NULL,
	"mimetype" varchar NOT NULL,
	"ref" varchar NOT NULL,
	"questionId" uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS "pipelineScriptRun" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compositeId" json PRIMARY KEY NOT NULL,
	"runStatus" script_run_status DEFAULT 'Queued' NOT NULL,
	"outputFile" uuid,
	"questionId" uuid NOT NULL,
	"submissionResultId" uuid,
	"pipelineScriptId" uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS "pipelineScripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"executableFileId" uuid NOT NULL,
	"questionVersionId" uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS "scriptRunDependency" (
	"runId" uuid NOT NULL,
	"previousRunId" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scriptRunDependency" ADD CONSTRAINT "scriptRunDependency_runId_previousRunId" PRIMARY KEY("runId","previousRunId");

CREATE UNIQUE INDEX IF NOT EXISTS "usernameIndex" ON "users" ("username");
CREATE UNIQUE INDEX IF NOT EXISTS "competition_team" ON "teams" ("competitionId","name");
CREATE UNIQUE INDEX IF NOT EXISTS "composite_id_index" ON "pipelineScriptRun" ("compositeId");
DO $$ BEGIN
 ALTER TABLE "providers" ADD CONSTRAINT "providers_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "questionInputs" ADD CONSTRAINT "questionInputs_questionId_questions_id_fk" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "questionInputs" ADD CONSTRAINT "questionInputs_file_files_id_fk" FOREIGN KEY ("file") REFERENCES "files"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "questionVersions" ADD CONSTRAINT "questionVersions_questionId_questions_id_fk" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "questions" ADD CONSTRAINT "questions_competitionId_competitions_id_fk" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "submissionResults" ADD CONSTRAINT "submissionResults_submissionId_submissions_id_fk" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "submissionResults" ADD CONSTRAINT "submissionResults_questionVersionId_questionVersions_id_fk" FOREIGN KEY ("questionVersionId") REFERENCES "questionVersions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "submissions" ADD CONSTRAINT "submissions_questionId_questions_id_fk" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "submissions" ADD CONSTRAINT "submissions_teamId_teams_id_fk" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "submissions" ADD CONSTRAINT "submissions_file_executableFiles_fileId_fk" FOREIGN KEY ("file") REFERENCES "executableFiles"("fileId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "teamMembers" ADD CONSTRAINT "teamMembers_teamId_teams_id_fk" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "teamMembers" ADD CONSTRAINT "teamMembers_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "teams" ADD CONSTRAINT "teams_competitionId_competitions_id_fk" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "executableFiles" ADD CONSTRAINT "executableFiles_fileId_files_id_fk" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "files" ADD CONSTRAINT "files_questionId_questions_id_fk" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "pipelineScriptRun" ADD CONSTRAINT "pipelineScriptRun_outputFile_files_id_fk" FOREIGN KEY ("outputFile") REFERENCES "files"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "pipelineScriptRun" ADD CONSTRAINT "pipelineScriptRun_questionId_questions_id_fk" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "pipelineScriptRun" ADD CONSTRAINT "pipelineScriptRun_submissionResultId_submissionResults_id_fk" FOREIGN KEY ("submissionResultId") REFERENCES "submissionResults"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "pipelineScriptRun" ADD CONSTRAINT "pipelineScriptRun_pipelineScriptId_pipelineScripts_executableFileId_fk" FOREIGN KEY ("pipelineScriptId") REFERENCES "pipelineScripts"("executableFileId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "pipelineScripts" ADD CONSTRAINT "pipelineScripts_executableFileId_executableFiles_fileId_fk" FOREIGN KEY ("executableFileId") REFERENCES "executableFiles"("fileId") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "pipelineScripts" ADD CONSTRAINT "pipelineScripts_questionVersionId_questionVersions_id_fk" FOREIGN KEY ("questionVersionId") REFERENCES "questionVersions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "scriptRunDependency" ADD CONSTRAINT "scriptRunDependency_runId_pipelineScriptRun_id_fk" FOREIGN KEY ("runId") REFERENCES "pipelineScriptRun"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "scriptRunDependency" ADD CONSTRAINT "scriptRunDependency_previousRunId_pipelineScriptRun_id_fk" FOREIGN KEY ("previousRunId") REFERENCES "pipelineScriptRun"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
