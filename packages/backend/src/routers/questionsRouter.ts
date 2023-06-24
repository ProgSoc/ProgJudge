import { z } from "zod";
import { adminProcedure, publicProcedure, t } from "../trpc";
import { SQL, and, eq, sql } from "drizzle-orm";
import { competitions, questions, submissions } from "../db/schema";
import { AddQuestionSchema, EditQuestionSchema } from "../schemas";
import { TRPCError } from "@trpc/server";

const questionsRouter = t.router({});

export default questionsRouter;
