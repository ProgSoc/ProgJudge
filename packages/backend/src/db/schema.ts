import {
  pgTable,
  serial,
  text,
  varchar,
  pgEnum,
  primaryKey,
  uniqueIndex,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

import { relations, sql } from "drizzle-orm";

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
    id: serial("id").primaryKey(),
    username: varchar("username").notNull(),
    roles: roleEnum('roles').array().default(sql`'{User}'`).notNull(),
  },
  (table) => ({
    usernameIndex: uniqueIndex("usernameIndex").on(table.username),
  })
);

export const usersRelations = relations(users, ({ one, many }) => ({
  providers: many(providers, {
    relationName: "userOnProvider",
  }),
  teamMemberships: many(teamMembers, {
    relationName: "userOnTeamMember",
  }),
}));

/**
 * The table that stores the user's authentication providers.
 */
export const providers = pgTable(
  "providers",
  {
    /** The oAuth Provider to sign in with */
    provider: text("provider", {
      enum: ["Google", "Github", "Email", "Discord"],
    }),
    /** The remote account id */
    providerId: varchar("provider_id").notNull(),
    /** The Id of the connected user */
    userId: serial("user_id")
      .notNull()
      .references(() => users.id),
    /** The access token for the provider */
    accessToken: text("access_token"),
    /** The refresh token for the provider */
    refreshToken: text("refresh_token"),
    /** The access token expires at */
    accessTokenExpires: text("access_token_expires"),
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

export const competitionsTypeEnum = pgEnum("competition_types", [
  "Individual",
  "Team",
]);

export const competitionsStatusEnum = pgEnum("competition_status", [
  "Pending",
  "Active",
  "Completed",
]);

/**
 * The table that stores the
 */
export const competitions = pgTable("competitions", {
  /** The Competition Id */
  id: serial("id").primaryKey(),
  /** The name of the competition */
  name: varchar("name"),
  /** The description (MD) of the competition */
  description: text("description"),
  /** The start time for the competition */
  start: timestamp("start"),
  /** The end time for the competition */
  end: timestamp("end"),
  /** The type of competition */
  type: competitionsTypeEnum('type').notNull().default(sql`'Team'`),
  /** The status of the competition */
  status: competitionsStatusEnum('status').notNull().default(sql`'Pending'`),
  /** Enabled languages */
  languages: text("languages").array(),
});

export const competitionsRelations = relations(
  competitions,
  ({ one, many }) => ({
    teams: many(teams, {
      relationName: "competitionOnTeam",
    }),
    questions: many(questions, {
      relationName: "competitionOnQuestion",
    }),
  })
);

/**
 * The table that stores the teams for the competition.
 */
export const teams = pgTable("teams", {
  /** The unique team Id belonging to the competition */
  id: serial("id").primaryKey(),
  /** The team name */
  name: varchar("name").notNull(),
  /** The competition that the team belongs to */
  competitionId: integer("competition_id")
    .notNull()
    .references(() => competitions.id),
});

export const teamsRelations = relations(teams, ({ one, many }) => ({
  competition: one(competitions, {
    fields: [teams.competitionId],
    references: [competitions.id],
    relationName: "competitionOnTeam",
  }),
  teamMembers: many(teamMembers, {
    relationName: "teamOnTeamMember",
  }),
  submissions: many(submissions, {
    relationName: "teamOnSubmission",
  }),
}));

/**
 * Team members table
 */
export const teamMembers = pgTable(
  "team_members",
  {
    /** The team that the user belongs to */
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    /** The user that belongs to the team */
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
  },
  (table) => ({
    /** The primary key is the union of their teamId and userId */
    pk: primaryKey(table.teamId, table.userId),
  })
);

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
    relationName: "teamOnTeamMember",
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
    relationName: "userOnTeamMember",
  }),
}));

/**
 * Questions table
 */
export const questions = pgTable("questions", {
  /** The question Id */
  id: serial("id").primaryKey(),
  /** The Id of the competition that the question belongs to */
  competitionId: integer("competition_id")
    .notNull()
    .references(() => competitions.id),
  /** The title of the question */
  title: varchar("title").notNull(),
  /** The markdown description of the question */
  question: text("question").notNull(),
  /** The expected answer */
  answer: text("answer").notNull(),
  /** The points awarded for the question */
  points: integer("points"),
});

export const questionsRelations = relations(questions, ({ one, many }) => ({
  competition: one(competitions, {
    fields: [questions.competitionId],
    references: [competitions.id],
    relationName: "competitionOnQuestion",
  }),
  submissions: many(submissions, {
    relationName: "questionOnSubmission",
  }),
}));

export const submissionsStatusEnum = pgEnum("submission_status", [
  "Pending",
  "Accepted",
  "Rejected",
]);

/**
 * Submissions table
 */
export const submissions = pgTable("submissions", {
  /** The id of the submission */
  id: serial("id").primaryKey(),
  /** The Id of the question */
  questionId: integer("question_id")
    .notNull()
    .references(() => questions.id),
  /** The Id of the team submitting the question */
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  /** The status of judging */
  status: submissionsStatusEnum('status').notNull().default(sql`'Pending'`),
  /** The code submitted, first file is the entry */
  submission: text("submission").array().notNull(),
  /** The number of points awarded for the submission */
  points: integer("points").notNull().default(0),
  /** When the answer was submitted */
  time: timestamp("time").notNull(),
  /** Result of stdout */
  result: text("result"),
  /** Language */
  language: text("language").notNull(),
});

export const submissionsRelations = relations(submissions, ({ one }) => ({
  question: one(questions, {
    fields: [submissions.questionId],
    references: [questions.id],
    relationName: "questionOnSubmission",
  }),
  team: one(teams, {
    fields: [submissions.teamId],
    references: [teams.id],
    relationName: "teamOnSubmission",
  }),
}));
