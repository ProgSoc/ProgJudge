import { z } from "zod";
import { adminProcedure, publicProcedure, t } from "../trpc";
import CreateCompetitionSchema from "../schemas/competitions/CreateCompetitionSchema";
import { competitions } from "../db/schema";
import { TRPCError } from "@trpc/server";
import EditCompetitionSchema from "../schemas/competitions/EditCompetitionSchema";
import { and, eq } from "drizzle-orm";

const competitionsRouter = t.router({
  /**
   * Create a new competition
   */
  create: adminProcedure
    .input(CreateCompetitionSchema)
    .mutation(async ({ ctx, input }) => {
      const newCompetitions = await ctx.db
        .insert(competitions)
        .values({
          name: input.name,
          description: input.description,
          start: new Date(input.start),
          end: new Date(input.end),
          languages: input.languages,
          status: "Pending",
        })
        .returning();

      const newCompetition = newCompetitions.at(0);

      if (!newCompetition) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to create competition",
        });
      }

      return newCompetition;
    }),

  /**
   * Get all competitions
   */
  getAll: adminProcedure.query(({ ctx }) => {
    return ctx.db.select().from(competitions);
  }),

  getInProgressCompetitions: publicProcedure.query(({ ctx }) => {
    return ctx.db
      .select()
      .from(competitions)
      .where(eq(competitions.status, "Active"));
  }),

  /**
   * Edit Competition
   */
  edit: adminProcedure
    .input(EditCompetitionSchema)
    .mutation(async ({ ctx, input }) => {
      const updatedCompetitions = await ctx.db
        .update(competitions)
        .set({
          name: input.name,
          description: input.description,
          start: new Date(input.start),
          end: new Date(input.end),
          languages: input.languages,
          status: input.status,
        })
        .where(eq(competitions.id, input.id))
        .returning();

      const updatedCompetition = updatedCompetitions.at(0);

      if (!updatedCompetition) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to update competition",
        });
      }

      return updatedCompetition;
    }),

  /** End an in-progress competition */
  end: adminProcedure.input(z.number()).mutation(async ({ ctx, input }) => {
    const updatedCompetitions = await ctx.db
      .update(competitions)
      .set({
        status: "Completed",
      })
      .where(eq(competitions.id, input))
      .returning();

    const updatedCompetition = updatedCompetitions.at(0);

    if (!updatedCompetition) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Failed to update competition",
      });
    }

    return updatedCompetition;
  }),

  getPublicCompetitionDetails: publicProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      const publicComps = await ctx.db
        .select()
        .from(competitions)
        .where(
          and(eq(competitions.id, input), eq(competitions.status, "Active"))
        );

      const competition = publicComps.at(0);

      if (!competition) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Couldn't find competition",
        });
      }

      return competition;
    }),
});

export default competitionsRouter;