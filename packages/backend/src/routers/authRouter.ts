import { InferModel, eq } from "drizzle-orm";
import { authedProcedure, publicProcedure, t } from "../trpc";
import { providers, teamMembers, teams, users } from "../db/schema";
import RegisterSchema from "../schemas/auth/RegisterSchema";
import argon2 from "argon2";
import LoginSchema from "../schemas/auth/LoginSchema";
import { TRPCError } from "@trpc/server";

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

  registerLocal: publicProcedure
    .input(RegisterSchema)
    .mutation(async ({ ctx, input }) => {
      const existingUserId = ctx.user?.id;

      const existingUser = await ctx.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.username, input.username),
      });

      if (existingUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Username already exists",
        });
      }

      const createdUsers = await ctx.db
        .insert(users)
        .values({
          username: input.username,
        })
        .returning();

      const firstUser = createdUsers[0];

      if (!firstUser) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
        });
      }

      const hashedPassword = await argon2.hash(input.password);

      const newProvider = await ctx.db
        .insert(providers)
        .values({
          provider: "Local",
          providerId: input.username,
          userId: firstUser.id,
          password: hashedPassword,
        })
        .returning();

      const firstProvider = newProvider[0];

      if (!firstProvider) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create provider",
        });
      }

      return firstUser;
    }),

  loginLocal: publicProcedure
    .input(LoginSchema)
    .mutation(async ({ ctx, input }) => {
      const provider = await ctx.db.query.providers.findFirst({
        where: (providers, { eq, and }) =>
          and(
            eq(providers.provider, "Local"),
            eq(providers.providerId, input.username)
          ),
      });

      if (!provider || !provider.password) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid username or password",
        });
      }

      const validPassword = await argon2.verify(
        provider.password,
        input.password
      );

      if (!validPassword) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid username or password",
        });
      }

      const user = await ctx.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, provider.userId),
      });

      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to find user",
        });
      }

      await ctx.login(user);

      return user;
    }),

    deleteAccount: authedProcedure.mutation(async ({ ctx }) => {
      const userId = ctx.user.id;

      await ctx.db.delete(users).where(eq(users.id, userId));

      await ctx.db.delete(providers).where(eq(providers.userId, userId));

      await ctx.db.delete(teamMembers).where(eq(teamMembers.userId, userId));

      return ctx.logout()
    })
});

export default authRouter;
