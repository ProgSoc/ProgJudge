import { InferModel } from "drizzle-orm";
import * as schema from "../db/schema";

declare global {
  namespace Express {
    export interface User extends InferModel<typeof schema.users> {}
  }
}
