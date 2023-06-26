import {
  pgTable,
  text,
  varchar,
  pgEnum,
  primaryKey,
  uniqueIndex,
  integer,
  timestamp,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";

import { relations, sql } from "drizzle-orm";
import { teamMembers } from "./competition";

/**
 * Database schema for a programming competition judging system.
 */

export const roleEnum = pgEnum("roles", ["Admin", "User"]);

/**
 * The table that stores the user's information.
 * Username is unique.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: varchar("username").notNull(),
    roles: roleEnum("roles")
      .array()
      .default(sql`'{User}'`)
      .notNull(),
  },
  (table) => ({
    usernameIndex: uniqueIndex("username_index").on(table.username),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  providers: many(providers, {
    relationName: "user_on_provider",
  }),
  teamMemberships: many(teamMembers, {
    relationName: "user_on_team_member",
  }),
}));

export const providerEnum = pgEnum("provider", [
  "Google",
  "Github",
  "Local",
  "Discord",
]);

/**
 * The table that stores the user's authentication providers.
 */
export const providers = pgTable(
  "providers",
  {
    /** The oAuth Provider to sign in with */
    provider: providerEnum("provider").notNull(),
    /** The remote account id */
    providerId: varchar("provider_id").notNull(),
    /** The Id of the connected user */
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    /** The access token for the provider */
    accessToken: text("access_token"),
    /** The refresh token for the provider */
    refreshToken: text("refresh_token"),
    /** The access token expires at */
    accessTokenExpires: text("access_token_expires"),
    /** Password (argon2) */
    password: text("password"),
  },
  (table) => ({
    pk: primaryKey(table.userId, table.provider),
  })
);

export const providersRelations = relations(providers, ({ one }) => ({
  user: one(users, {
    fields: [providers.userId],
    references: [users.id],
    relationName: "user_on_provider",
  }),
}));
