ALTER TABLE "submissions" ALTER COLUMN "submission" SET NOT NULL;
ALTER TABLE "submissions" ALTER COLUMN "points" SET DEFAULT 0;
ALTER TABLE "submissions" ALTER COLUMN "points" SET NOT NULL;
ALTER TABLE "submissions" ALTER COLUMN "time" SET NOT NULL;
ALTER TABLE "teams" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "submissions" ADD COLUMN "result" text;