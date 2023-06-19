import { Strategy } from "passport-github2";
import type * as oauth2 from "passport-oauth2";
import db from "../db/db";
import { providers, users } from "../db/schema";
import { eq } from "drizzle-orm";

type VerifyFunctionParams = Parameters<oauth2.VerifyFunctionWithRequest>;

const verify: oauth2.VerifyFunctionWithRequest = async function verify(
  req: VerifyFunctionParams["0"],
  accessToken: VerifyFunctionParams["1"],
  refreshToken: VerifyFunctionParams["2"],
  profile: VerifyFunctionParams["3"],
  done: VerifyFunctionParams["4"]
) {
  let userId = req.user?.id;

      /**
       * If the user is logged in, check if the provider already exists
       */
      const existingProvider = await db.query.providers.findFirst({
        where: (users, { eq, and }) =>
          and(eq(users.provider, "Github"), eq(users.providerId, profile.id)),
        with: {
          user: true,
        },
      });

      if (existingProvider) {
        return done(null, existingProvider.user);
      }

      /**
       * If the user is not logged in, create a new user
       */
      if (!userId) {
        const createdUsers = await db
          .insert(users)
          .values({
            username: profile.username,
          })
          .returning({ id: users.id });

        const firstUser = createdUsers[0];

        if (!firstUser) {
          return done(new Error("Failed to create user"));
        }

        userId = firstUser.id;
      }

      if (!userId) {
        return done(new Error("Failed to create user"));
      }

      const newProvider = await db
        .insert(providers)
        .values({
          provider: "Github",
          providerId: profile.id,
          userId,
          accessToken,
          refreshToken,
        })
        .returning();

      const firstProvider = newProvider[0];

      if (!firstProvider) {
        return done(new Error("Failed to create provider"));
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        return done(new Error("Failed to find user"));
      }

      return done(null, user);
};

const githubStrategy = (clientID: string, clientSecret: string, callbackURL: string) => new Strategy(
  {
    callbackURL,
    clientID,
    clientSecret,
    passReqToCallback: true,
  },
  verify
);

export default githubStrategy;