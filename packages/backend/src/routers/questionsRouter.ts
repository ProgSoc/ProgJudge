import { z } from "zod";
import { adminProcedure, publicProcedure, t } from "../trpc";
import { eq } from "drizzle-orm";
import { competitions, questions } from "../db/schema";
import { AddQuestionSchema, EditQuestionSchema } from "../schemas";
import { TRPCError } from "@trpc/server";

const questionsRouter = t.router({
  getCompetitionQuestions: publicProcedure
    .input(z.number().describe("The competition Id"))
    .query(({ ctx, input }) => {
      return ctx.db
        .select({
          id: questions.id,
          competitionId: questions.competitionId,
          question: questions.question,
          title: questions.title,
          points: questions.points,
        })
        .from(questions)
        .leftJoin(competitions, eq(questions.competitionId, competitions.id))
        .where(eq(questions.competitionId, input));
    }),

  addCompetitionQuestion: adminProcedure
    .input(AddQuestionSchema)
    .mutation(async ({ ctx, input }) => {
      const newQuestions = await ctx.db
        .insert(questions)
        .values({
          competitionId: input.competitionId,
          question: input.question,
          title: input.title,
          points: input.points,
          stdin: input.stdin,
          stdout: input.stdout,
        })
        .returning();

      const newQuestion = newQuestions.at(0);

      if (!newQuestion) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to add question",
        });
      }

      return newQuestion;
    }),

  deleteCompetitionQuestion: adminProcedure
    .input(z.number().describe("The question Id"))
    .mutation(async ({ ctx, input }) => {
      const deletedQuestions = await ctx.db
        .delete(questions)
        .where(eq(questions.id, input))
        .returning();

      const deletedQuestion = deletedQuestions.at(0);

      if (!deletedQuestion) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to delete question",
        });
      }

      return deletedQuestion;
    }),

  editCompetitionQuestion: adminProcedure
    .input(EditQuestionSchema)
    .mutation(async ({ ctx, input }) => {
      const updatedQuestions = await ctx.db
        .update(questions)
        .set({
          question: input.question,
          title: input.title,
          points: input.points,
          stdout: input.stdout,
          stdin: input.stdin,
        })
        .where(eq(questions.id, input.id))
        .returning();

      const updatedQuestion = updatedQuestions.at(0);

      if (!updatedQuestion) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to update question",
        });
      }

      return updatedQuestion;
    }),
});

export default questionsRouter;