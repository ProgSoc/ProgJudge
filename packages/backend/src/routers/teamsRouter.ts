import { z } from "zod";
import { teamMembers, teams, users } from "../db/schema";
import { adminProcedure, authedProcedure, t } from "../trpc";
import { and, eq } from "drizzle-orm";
import { AddTeamMemberSchema, CreateTeamSchema } from "../schemas";
import { TRPCError } from "@trpc/server";

const teamsRouter = t.router({
  /**
   * Get all the teams for a specific competition
   */
  getCompetitionTeams: adminProcedure
    .input(z.string().optional())
    .query(({ ctx, input }) => {
      if (!input) {
        return ctx.db.select().from(teams);
      } else {
        return ctx.db
          .select()
          .from(teams)
          .where(eq(teams.competitionId, input));
      }
    }),
  /**
   * Create team
   */
  createTeam: adminProcedure
    .input(CreateTeamSchema)
    .mutation(async ({ ctx, input }) => {
      const newTeams = await ctx.db
        .insert(teams)
        .values({
          name: input.name,
          competitionId: input.competitionId,
          displayName: input.displayName,
        })
        .returning();

      const newTeam = newTeams.at(0);
      if (!newTeam) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to create team",
        });
      }
      return newTeam;
    }),
  /**
   * Add a team member
   */
  addTeamMember: adminProcedure
    .input(AddTeamMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const newTeamMembers = await ctx.db
        .insert(teamMembers)
        .values({
          teamId: input.teamId,
          userId: input.userId,
        })
        .returning();

      const newTeamMember = newTeamMembers.at(0);

      if (!newTeamMember) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to add team member",
        });
      }

      return newTeamMember;
    }),

  /**
   * Remove a team member
   */
  removeTeamMember: adminProcedure
    .input(AddTeamMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const deletedTeamMembers = await ctx.db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, input.teamId),
            eq(teamMembers.userId, input.userId)
          )
        )
        .returning();

      const deletedTeamMember = deletedTeamMembers.at(0);

      if (!deletedTeamMember) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to remove team member",
        });
      }

      return deletedTeamMember;
    }),

  /**
   * Get all the team members for a specific team
   */
  getAdminTeamMembers: authedProcedure
    .input(z.string())
    .query(({ ctx, input }) => {
      return ctx.db
        .select({
          id: users.id,
          name: users.username,
        })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, input))
        .leftJoin(users, eq(teamMembers.userId, users.id));
    }),

  getTeamMembers: authedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const teamId = input;

      const isUserMemberOfTeam = await ctx.db
        .select()
        .from(teamMembers)
        .where(
          and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
        );

      if (!isUserMemberOfTeam) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to find team",
        });
      }

      return ctx.db
        .select({
          id: users.id,
          name: users.username,
        })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, input))
        .leftJoin(users, eq(teamMembers.userId, users.id));
    }),

  getAdminTeam: adminProcedure
    .input(z.string().describe("teamId"))
    .query(async ({ ctx, input }) => {
      const selectedTeams = await ctx.db
        .select()
        .from(teams)
        .where(eq(teams.id, input));
      const selectedTeam = selectedTeams.at(0);
      if (!selectedTeam) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to find team",
        });
      }
      return selectedTeam;
    }),

  getTeam: authedProcedure
    .input(z.string().describe("teamId"))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const teamId = input;
      const myTeams = await ctx.db
        .select()
        .from(teamMembers)
        .where(
          and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
        );
      const myTeam = myTeams.at(0);
      if (!myTeam) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to find team",
        });
      }

      return myTeam;
    }),
});

export default teamsRouter;
