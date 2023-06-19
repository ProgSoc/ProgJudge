import { InferModel, eq } from "drizzle-orm";
import { authedProcedure, publicProcedure, t } from "../trpc";
import { providers, teamMembers, teams, users } from "../db/schema";

const authRouter = t.router({
  logout: authedProcedure.mutation(({ ctx }) => {
    return ctx.logout();
  }),
  getMe: publicProcedure.query(({ ctx }) => {
    return (ctx.user ?? null) as InferModel<typeof users, "select"> | null;
  }),
  getMyTeams: authedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const teamsQuery = await ctx.db
      .select({
        id: teams.id,
        name: teams.name,
        competitionId: teams.competitionId,
      })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId))
      .leftJoin(teams, eq(teamMembers.teamId, teams.id));

    return teamsQuery;
  }),
  getMyConnections: authedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const connectionsQuery = await ctx.db
      .select({
        id: providers.providerId,
        name: providers.provider,
      })
      .from(providers)
      .where(eq(providers.userId, userId));

    return connectionsQuery;
  }),
});

export default authRouter;
