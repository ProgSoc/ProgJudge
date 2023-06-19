import postgres from "postgres";
import env from "../env";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const queryClient = postgres(env.SECRET_DB_URL);
const db = drizzle(queryClient, { schema });

export default db;
