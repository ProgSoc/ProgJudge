import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate as drizzleMigrate } from "drizzle-orm/postgres-js/migrator";
import path from "path";
import postgres from "postgres";
import { fileURLToPath } from "url";
import logger from "../logger";

const rootFilePath = fileURLToPath(import.meta.url);

const migrationsPath = path.join(rootFilePath, "../", "db", "migrations");

export default async function migrate(dbUri: string) {
  const migrationScope = logger.scope("Migration");

  const db = postgres(dbUri, { max: 1 });
  migrationScope.time("Database Migration");
  await drizzleMigrate(drizzle(db), {
    migrationsFolder: migrationsPath,
    migrationsTable: "migrations",
  });
  migrationScope.timeEnd("Database Migration");
  migrationScope.success("Successfully Migrated");
}
