import { Strategy } from "passport-github2";
import type * as oauth2 from "passport-oauth2";
import env from "../env";
import db from "../db/db";
import { providers, users } from "../db/schema";

type VerifyFunctionParams = Parameters<oauth2.VerifyFunction>;

const verify: oauth2.VerifyFunction = async function verify(
  accessToken: VerifyFunctionParams["0"],
  refreshToken: VerifyFunctionParams["1"],
  profile: VerifyFunctionParams["2"],
  done: VerifyFunctionParams["3"]
) {
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

  const user = await db
    .insert(users)
    .values({
      username: profile.username,
    })
    .returning();

  const firstUser = user[0];

  if (!firstUser) {
    return done(new Error("Failed to create user"));
  }

  const newProvider = await db
    .insert(providers)
    .values({
      provider: "Github",
      providerId: profile.id,
      userId: firstUser.id,
      accessToken,
      refreshToken,
    })
    .returning();

  const firstProvider = newProvider[0];

  if (!firstProvider) {
    return done(new Error("Failed to create provider"));
  }

  return done(null, firstUser);
};

const githubStrategy = new Strategy(
  {
    callbackURL: env.GITHUB_CALLBACK_URL,
    clientID: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  },
  verify
);

export default githubStrategy;