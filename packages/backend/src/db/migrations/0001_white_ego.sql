ALTER TYPE "provider_providers" ADD VALUE 'Local';
ALTER TABLE "providers" ADD COLUMN "password" text;