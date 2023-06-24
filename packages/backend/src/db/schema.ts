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

/**
 * The table that stores the
 */
export const competitions = pgTable("competitions", {
  /** The Competition Id */
  id: uuid("id").primaryKey().defaultRandom(),
  /** The name of the competition */
  name: varchar("name"),
});

export const competitionsRelations = relations(competitions, ({ many }) => ({
  teams: many(teams, {
    relationName: "competitionOnTeam",
  }),
  questions: many(questions, {
    relationName: "competitionOnQuestion",
  }),
}));

/**
 * The table that stores the teams for the competition.
 */
export const teams = pgTable(
  "teams",
  {
    /** The unique team Id belonging to the competition */
    id: uuid("id").primaryKey().defaultRandom(),
    /** The internal name for the team */
    name: varchar("name").notNull(),
    /** The display team name */
    displayName: varchar("displayName").notNull(),
    /** The competition that the team belongs to */
    competitionId: uuid("competitionId")
      .notNull()
      .references(() => competitions.id),
  },
  (table) => ({
    pk: primaryKey(table.competitionId, table.name),
  })
);

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
  "teamMembers",
  {
    /** The team that the user belongs to */
    teamId: uuid("teamId")
      .notNull()
      .references(() => teams.id),
    /** The user that belongs to the team */
    userId: uuid("userId")
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
  id: uuid("id").primaryKey().defaultRandom(),
  /** The Id of the competition that the question belongs to */
  competitionId: uuid("competitionId")
    .notNull()
    .references(() => competitions.id),
  /** The internal name of the question */
  name: varchar("name").notNull(),
  /** The display name of the question */
  displayName: varchar("displayName").notNull(),
  /** The markdown description of the question */
  description: text("description").notNull(),
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
  versions: many(questionVersions, {
    relationName: "versionOnQuestion",
  }),
}));

/**
 * Questions table
 */
export const questionVersions = pgTable("questionVersions", {
  /** The question Id */
  id: uuid("id").primaryKey().defaultRandom(),
  /** The question that this version belongs to */
  questionId: uuid("questionId")
    .notNull()
    .references(() => questions.id),
  /** The internal name of the question */
  pipelineConfig: jsonb("pipelineConfig").$type<{ foo: "todo" }>().notNull(),
});

export const questionVersionRelations = relations(
  questionVersions,
  ({ one, many }) => ({
    question: one(questions, {
      fields: [questionVersions.questionId],
      references: [questions.id],
      relationName: "versionOnQuestion",
    }),
    pipelineScripts: many(pipelineScripts, {
      relationName: "pipelineScriptOnQuestionVersion",
    }),
  })
);

export const questionInputs = pgTable("questionInputs", {
  /** The input Id */
  id: uuid("id").primaryKey().defaultRandom(),
  /** The question that this input belongs to */
  questionId: uuid("questionId")
    .notNull()
    .references(() => questions.id),
  /** The internal name of the input */
  name: varchar("name").notNull(),
  /** The display name of the input */
  displayName: varchar("displayName").notNull(),
  /** The file this input is associated with */
  file: uuid("file")
    .notNull()
    .references(() => files.id),
});

export const questionInputRelations = relations(questionInputs, ({ one }) => ({
  question: one(questions, {
    fields: [questionInputs.questionId],
    references: [questions.id],
    relationName: "inputOnQuestion",
  }),
  file: one(files, {
    fields: [questionInputs.file],
    references: [files.id],
    relationName: "fileOnQuestionInput",
  }),
}));

export const submissionsResultEnum = pgEnum("submissionsResult", [
  "Pending",
  "PipelineFailed",
  "CompileError",
  "RuntimeError",
  "OutcomeFailed",
  "Passed",
]);

/**
 * Submissions table
 */
export const submissions = pgTable("submissions", {
  /** The id of the submission */
  id: uuid("id").primaryKey().defaultRandom(),
  /** The Id of the question */
  questionId: uuid("questionId")
    .notNull()
    .references(() => questions.id),
  /** The Id of the team submitting the question */
  teamId: uuid("teamId")
    .notNull()
    .references(() => teams.id),
  /** The status of judging */
  status: submissionsResultEnum("status").default(sql`'Pending'`),
  /** The executable file submitted */
  file: uuid("file")
    .notNull()
    .references(() => executableFiles.fileId),
});

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
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
  results: many(submissionResults, {
    relationName: "resultOnSubmission",
  }),
  executableFile: one(executableFiles, {
    fields: [submissions.file],
    references: [executableFiles.fileId],
    relationName: "fileOnSubmission",
  }),
}));

/**
 * Submissions table
 */
export const submissionResults = pgTable("submissionResults", {
  /** The id of the submission */
  id: uuid("id").primaryKey().defaultRandom(),
  /** The submission that this result belongs to */
  submissionId: uuid("submissionId")
    .notNull()
    .references(() => submissions.id),
  /** The submission that this result belongs to */
  questionVersionId: uuid("questionVersionId")
    .notNull()
    .references(() => questionVersions.id),
  /** The status of judging */
  status: submissionsResultEnum("status")
    .notNull()
    .default(sql`'Pending'`),
});

export const submissionResultsRelations = relations(
  submissionResults,
  ({ one }) => ({
    submission: one(submissions, {
      fields: [submissionResults.submissionId],
      references: [submissions.id],
      relationName: "resultOnSubmission",
    }),
    questionVersion: one(questionVersions, {
      fields: [submissionResults.questionVersionId],
      references: [questionVersions.id],
      relationName: "resultOnQuestionVersion",
    }),
  })
);

/**
 * File (s3 storage)
 */
export const files = pgTable("files", {
  /** The id of the file */
  id: uuid("id").primaryKey().defaultRandom(),
  /** The hash of the file */
  hash: varchar("hash").notNull(),
  /** The filename of the file */
  filename: varchar("filename").notNull(),
  /** The size of the file */
  size: integer("size").notNull(),
  /** The mimetype of the file */
  mimetype: varchar("mimetype").notNull(),
  /** The s3 ref of the file */
  ref: varchar("ref").notNull(),
});

export const filesRelations = relations(files, ({ one, many }) => ({}));

export const executableFiles = pgTable("executableFiles", {
  /** The id of the referenced file */
  fileId: uuid("fileId")
    .notNull()
    .primaryKey()
    .references(() => files.id),
  /** The runtime to use for the file */
  runtime: varchar("runtime").notNull(),
});

export const executableFilesRelations = relations(
  executableFiles,
  ({ one, many }) => ({
    file: one(files, {
      fields: [executableFiles.fileId],
      references: [files.id],
      relationName: "fileOnExecutableFile",
    }),
  })
);

export const pipelineScripts = pgTable("pipelineScripts", {
  /** The id of the referenced file */
  fileId: uuid("fileId")
    .notNull()
    .primaryKey()
    .references(() => executableFiles.fileId),
  /** The question version that this script belongs to */
  questionVersionId: uuid("questionVersionId")
    .notNull()
    .primaryKey()
    .references(() => questionVersions.id),
});

export const pipelineScriptsRelations = relations(
  pipelineScripts,
  ({ one, many }) => ({
    file: one(executableFiles, {
      fields: [pipelineScripts.fileId],
      references: [executableFiles.fileId],
      relationName: "fileOnPipelineScript",
    }),
    questionVersion: one(questionVersions, {
      fields: [pipelineScripts.questionVersionId],
      references: [questionVersions.id],
      relationName: "pipelineScriptOnQuestionVersion",
    }),
    runs: many(pipelineScriptRun, {
      relationName: "runOnPipelineScript",
    }),
  })
);

export const pipelineScriptRun = pgTable("pipelineScriptRun", {
  /** The id of the run */
  id: uuid("id").primaryKey().defaultRandom(),
  /** The id if othe pipeline script */
  pipelineScriptId: uuid("pipelineScriptId")
    .notNull()
    .references(() => pipelineScripts.fileId),
  /** The output file */
  outputFile: uuid("outputFile").references(() => files.id),
});

export const pipelineScriptRunRelations = relations(
  pipelineScriptRun,
  ({ one, many }) => ({
    pipelineScript: one(pipelineScripts, {
      fields: [pipelineScriptRun.pipelineScriptId],
      references: [pipelineScripts.fileId],
      relationName: "runOnPipelineScript",
    }),
    output: one(files, {
      fields: [pipelineScriptRun.outputFile],
      references: [files.id],
      relationName: "outputOnPipelineScriptRun",
    }),
    dependentRuns: many(scriptRunDependency, {
      relationName: "previousRunOnScriptRunDependency",
    }),
  })
);

export const scriptRunDependency = pgTable("scriptRunDependency", {
  /** The id of the dependency */
  id: uuid("id").primaryKey().defaultRandom(),
  /** The id of the run */
  runId: uuid("runId")
    .notNull()
    .references(() => pipelineScriptRun.id),

  // Either one or the other below is set, can't be both

  /** The optional id of the question input */
  questionInputId: uuid("questionInputId").references(() => questionInputs.id),
  /** The optional id of a previous script run */
  previousRunId: uuid("previousRunId").references(() => pipelineScriptRun.id),
});

export const scriptRunDependencyRelations = relations(
  scriptRunDependency,
  ({ one }) => ({
    run: one(pipelineScriptRun, {
      fields: [scriptRunDependency.runId],
      references: [pipelineScriptRun.id],
      relationName: "runOnScriptRunDependency",
    }),
    questionInput: one(questionInputs, {
      fields: [scriptRunDependency.questionInputId],
      references: [questionInputs.id],
      relationName: "questionInputOnScriptRunDependency",
    }),
    previousRun: one(pipelineScriptRun, {
      fields: [scriptRunDependency.previousRunId],
      references: [pipelineScriptRun.id],
      relationName: "previousRunOnScriptRunDependency",
    }),
  })
);
