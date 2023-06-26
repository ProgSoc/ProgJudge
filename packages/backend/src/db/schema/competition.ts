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
  boolean,
} from "drizzle-orm/pg-core";

import { relations, sql } from "drizzle-orm";
import { users } from "./auth";
import { executableFiles, files, pipelineScripts } from "./execution";
import { PipelineSchema } from "../../pipelines/pipelineConfig";

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
    relationName: "competition_on_team",
  }),
  questions: many(questions, {
    relationName: "competition_on_question",
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
    displayName: varchar("display_name").notNull(),
    /** The competition that the team belongs to */
    competitionId: uuid("competition_id")
      .notNull()
      .references(() => competitions.id),
  },
  (table) => ({
    competitionTam: uniqueIndex("competition_team").on(
      table.competitionId,
      table.name
    ),
  })
);

export const teamsRelations = relations(teams, ({ one, many }) => ({
  competition: one(competitions, {
    fields: [teams.competitionId],
    references: [competitions.id],
    relationName: "competition_on_team",
  }),
  teamMembers: many(teamMembers, {
    relationName: "team_on_team_member",
  }),
  submissions: many(submissions, {
    relationName: "team_on_submission",
  }),
}));

/**
 * Team members table
 */
export const teamMembers = pgTable(
  "teamMembers",
  {
    /** The team that the user belongs to */
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id),
    /** The user that belongs to the team */
    userId: uuid("user_id")
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
    relationName: "team_on_team_member",
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
    relationName: "user_on_team_member",
  }),
}));

/**
 * Questions table
 */
export const questions = pgTable("questions", {
  /** The question Id */
  id: uuid("id").primaryKey().defaultRandom(),
  /** The Id of the competition that the question belongs to */
  competitionId: uuid("competition_id")
    .notNull()
    .references(() => competitions.id),
  /** The internal name of the question */
  name: varchar("name").notNull(),
  /** The display name of the question */
  displayName: varchar("display_name").notNull(),
  /** The markdown description of the question */
  description: text("description").notNull(),
});

export const questionsRelations = relations(questions, ({ one, many }) => ({
  competition: one(competitions, {
    fields: [questions.competitionId],
    references: [competitions.id],
    relationName: "competition_on_question",
  }),
  submissions: many(submissions, {
    relationName: "question_on_submission",
  }),
  versions: many(questionVersions, {
    relationName: "version_on_question",
  }),
  files: many(files, {
    relationName: "file_on_question",
  }),
}));

/**
 * Questions table
 */
export const questionVersions = pgTable("question_versions", {
  /** The question Id */
  id: uuid("id").primaryKey().defaultRandom(),
  /** The question that this version belongs to */
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id),
  /** The internal name of the question */
  pipelineConfig: jsonb("pipeline_config").$type<PipelineSchema>().notNull(),
});

export const questionVersionRelations = relations(
  questionVersions,
  ({ one, many }) => ({
    question: one(questions, {
      fields: [questionVersions.questionId],
      references: [questions.id],
      relationName: "version_on_question",
    }),
    pipelineScripts: many(pipelineScripts, {
      relationName: "pipeline_script_on_question_version",
    }),
    inputs: many(questionTestCases, {
      relationName: "test_case_on_question_version",
    }),
  })
);

export const questionTestCases = pgTable("question_test_cases", {
  /** The input Id */
  id: uuid("id").primaryKey().defaultRandom(),
  /** The question that this input belongs to */
  questionVersionId: uuid("question_version_id")
    .notNull()
    .references(() => questionVersions.id),
  /** The internal name of the input */
  name: varchar("name").notNull(),
  /** The display name of the input */
  displayName: varchar("display_name").notNull(),
  /** Whether the input is hidden */
  hidden: boolean("hidden").notNull().default(false),
  /** The file this input is associated with */
  fileId: uuid("file_id")
    .notNull()
    .references(() => files.id),
});

export const questionTestCaseRelations = relations(
  questionTestCases,
  ({ one }) => ({
    question: one(questionVersions, {
      fields: [questionTestCases.questionVersionId],
      references: [questionVersions.id],
      relationName: "test_case_on_question_version",
    }),
    file: one(files, {
      fields: [questionTestCases.fileId],
      references: [files.id],
      relationName: "file_on_question_test_case",
    }),
  })
);

export const submissionsResultStatusEnum = pgEnum("submissions_result_status", [
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
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id),
  /** The Id of the team submitting the question */
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id),
  /** The status of judging */
  status: submissionsResultStatusEnum("status").default(sql`'Pending'`),
  /** The executable file submitted */
  file: uuid("file")
    .notNull()
    .references(() => executableFiles.fileId),
});

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  question: one(questions, {
    fields: [submissions.questionId],
    references: [questions.id],
    relationName: "question_on_submission",
  }),
  team: one(teams, {
    fields: [submissions.teamId],
    references: [teams.id],
    relationName: "team_on_submission",
  }),
  results: many(submissionResults, {
    relationName: "result_on_submission",
  }),
  executableFile: one(executableFiles, {
    fields: [submissions.file],
    references: [executableFiles.fileId],
    relationName: "file_on_submission",
  }),
}));

/**
 * Submissions table
 */
export const submissionResults = pgTable("submission_results", {
  /** The id of the submission */
  id: uuid("id").primaryKey().defaultRandom(),
  /** The submission that this result belongs to */
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissions.id),
  /** The submission that this result belongs to */
  questionVersionId: uuid("question_version_id")
    .notNull()
    .references(() => questionVersions.id),
  /** The status of judging */
  status: submissionsResultStatusEnum("status")
    .notNull()
    .default(sql`'Pending'`),
});

export const submissionResultsRelations = relations(
  submissionResults,
  ({ one }) => ({
    submission: one(submissions, {
      fields: [submissionResults.submissionId],
      references: [submissions.id],
      relationName: "result_on_submission",
    }),
    questionVersion: one(questionVersions, {
      fields: [submissionResults.questionVersionId],
      references: [questionVersions.id],
      relationName: "result_on_question_version",
    }),
  })
);
