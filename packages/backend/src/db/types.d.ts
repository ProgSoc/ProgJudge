import type { InferModel } from "drizzle-orm";
import type { competitions, questions, teams, users } from "./schema";

export type User = InferModel<typeof users, "select">;

export type Competition = InferModel<typeof competitions, "select">;

export type Team = InferModel<typeof teams, "select">;

export type Question = InferModel<typeof questions, "select">;
