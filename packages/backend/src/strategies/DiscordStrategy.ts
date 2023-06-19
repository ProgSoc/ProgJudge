import { Strategy } from "passport-discord";
import type * as oauth2 from "passport-oauth2";
import db from "../db/db";
import { providers, users } from "../db/schema";
import { eq } from "drizzle-orm";

const discordStrategy = (
  clientID: string,
  clientSecret: string,
  callbackURL: string
) =>
  new Strategy(
    {
      clientID,
      clientSecret,
      callbackURL,
      passReqToCallback: true,
      scope: [
        "identify",
      ]
    },
    async (req, accessToken, refreshToken, profile, done) => {
      let userId = req.user?.id;

      /**
       * If the user is logged in, check if the provider already exists
       */
      const existingProvider = await db.query.providers.findFirst({
        where: (users, { eq, and }) =>
          and(eq(users.provider, "Discord"), eq(users.providerId, profile.id)),
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
          provider: "Discord",
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
    }
  );

export default discordStrategy;
