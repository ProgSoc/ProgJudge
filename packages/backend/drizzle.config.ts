import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema",
  connectionString: process.env.DB_URL,
  out: "./src/db/migrations",
} satisfies Config;