import { z } from "zod";
import { adminProcedure, publicProcedure, t } from "../trpc";
import CreateCompetitionSchema from "../schemas/competitions/CreateCompetitionSchema";
import { competitions, questions, submissions, teams } from "../db/schema";
import { TRPCError } from "@trpc/server";
import EditCompetitionSchema from "../schemas/competitions/EditCompetitionSchema";
import { and, eq, inArray } from "drizzle-orm";

const competitionsRouter = t.router({
  /**
   * Get all competitions
   */
  getAll: adminProcedure.query(({ ctx }) => {
    return ctx.db.select().from(competitions);
  }),
});

export default competitionsRouter;
