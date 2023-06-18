import { InferModel, and, desc, eq, inArray } from "drizzle-orm";
import {
  competitions,
  questions,
  submissions,
  teamMembers,
  teams,
} from "../db/schema";
import { adminProcedure, authedProcedure, t } from "../trpc";
import { z } from "zod";
import { CreateSubmissionSchema } from "../schemas";
import { TRPCError } from "@trpc/server";
import queue from "../queue";

const submissionsRouter = t.router({
  getCompetitionSubmissions: adminProcedure
    .input(z.number())
    .query(({ ctx, input }) => {
      return ctx.db
        .select({
          id: submissions.id,
          teamId: submissions.teamId,
          questionId: submissions.questionId,
          points: submissions.points,
          status: submissions.status,
          time: submissions.time,
          result: submissions.result,
        })
        .from(submissions)
        .leftJoin(teams, eq(submissions.teamId, teams.id))
        .leftJoin(competitions, eq(teams.competitionId, competitions.id))
        .where(eq(competitions.id, input));
    }),

  getMyTeamsQuestionSubmissions: authedProcedure
    .input(z.number().describe("The question Id"))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id; // The user id of the user making the request

      const userTeams = await ctx.db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId));

      const submissionsQuery = await ctx.db
        .select({
          id: submissions.id,
          questionId: submissions.questionId,
          teamId: submissions.teamId,
          status: submissions.status,
          submission: submissions.submission,
          points: submissions.points,
          result: submissions.result,
        })
        .from(teams)
        .leftJoin(submissions, eq(submissions.teamId, teams.id))
        .where(
          and(
            inArray(
              teams.id,
              userTeams.map((team) => team.teamId)
            ),
            eq(submissions.questionId, input)
          )
        )
        .orderBy(desc(submissions.time));

      return submissionsQuery;
    }),

  createSubmission: authedProcedure
    .input(CreateSubmissionSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id; // The user id of the user making the request

      const userTeams = await ctx.db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId));

      if (!userTeams.map(({ teamId }) => teamId).includes(input.teamId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is not a member of the team",
        });
      }

      const teamsQuery = await ctx.db
        .select({ id: teams.id, competitionId: teams.competitionId })
        .from(teams)
        .where(eq(teams.id, input.teamId));

      const team = teamsQuery.at(0);

      if (!team) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to find team",
        });
      }

      const questionsQuery = await ctx.db
        .select()
        .from(questions)
        .where(eq(questions.id, input.questionId));

      const question = questionsQuery.at(0);

      if (question?.competitionId !== team.competitionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Question is not part of the competition",
        });
      }

      const sortedFiles = input.files.sort((a, b) => (a.entryPoint ? 1 : -1));

      const createdSubmissions = await ctx.db.insert(submissions).values({
        teamId: input.teamId,
        questionId: input.questionId,
        submission: sortedFiles.map((file) => file.content),
        time: new Date(),
        status: "Pending",
        language: input.language,
      });

      const createdSubmission = createdSubmissions.at(0);

      if (!createdSubmission) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to create submission",
        });
      }
      
      // TODO: Queue submission for grading
      await queue.add("judging", createdSubmission)

      return createdSubmission;
    }),
});
