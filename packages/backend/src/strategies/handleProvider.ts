import { InferModel, eq } from "drizzle-orm";
import { providers, users } from "../db/schema";
import db from "../db/db";

export default async function handleProvider(
  provider: InferModel<typeof providers, "select">["provider"],
  accessToken: string,
  refreshToken: string,
  remoteUserId: string,
  username: string,
  existingUserId?: string
): Promise<InferModel<typeof users, "select">> {
  let userId = existingUserId;

  /**
   * If the user is logged in, check if the provider already exists
   */
  const existingProvider = await db.query.providers.findFirst({
    where: (users, { eq, and }) =>
      and(eq(users.provider, provider), eq(users.providerId, remoteUserId)),
    with: {
      user: true,
    },
  });

  if (existingProvider) {
    return existingProvider.user;
  }

  /**
   * If the user is not logged in, create a new user
   */
  if (!userId) {
    const createdUsers = await db
      .insert(users)
      .values({
        username,
      })
      .returning({ id: users.id });

    const firstUser = createdUsers[0];

    if (!firstUser) {
      throw new Error("Failed to create user");
    }

    userId = firstUser.id;
  }

  if (!userId) {
    throw new Error("Failed to create user");
  }

  const newProvider = await db
    .insert(providers)
    .values({
      provider,
      providerId: remoteUserId,
      userId,
      accessToken,
      refreshToken,
    })
    .returning();

  const firstProvider = newProvider[0];

  if (!firstProvider) {
    throw new Error("Failed to create provider");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error("Failed to find user");
  }

  return user;
}
