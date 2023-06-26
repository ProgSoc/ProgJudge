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
    usernameIndex: uniqueIndex("usernameIndex").on(table.username),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  providers: many(providers, {
    relationName: "userOnProvider",
  }),
  teamMemberships: many(teamMembers, {
    relationName: "userOnTeamMember",
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
    providerId: varchar("providerId").notNull(),
    /** The Id of the connected user */
    userId: uuid("userId")
      .notNull()
      .references(() => users.id),
    /** The access token for the provider */
    accessToken: text("accessToken"),
    /** The refresh token for the provider */
    refreshToken: text("refreshToken"),
    /** The access token expires at */
    accessTokenExpires: text("accessTokenExpires"),
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
    relationName: "userOnProvider",
  }),
}));
