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
  json,
} from "drizzle-orm/pg-core";

import { relations, sql } from "drizzle-orm";
import {
  questionTestCases,
  questionVersions,
  questions,
  submissionResults,
} from "./competition";
import { CompositeId, ScriptCompositeId } from "../../pipelines/composition";

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
  /** The question that the file is associated with */
  questionId: uuid("questionId")
    .notNull()
    .references(() => questions.id),
});

export const filesRelations = relations(files, ({ one, many }) => ({
  question: one(questions, {
    fields: [files.questionId],
    references: [questions.id],
    relationName: "fileOnQuestion",
  }),
}));

export const executableFiles = pgTable("executableFiles", {
  /** The id of the file */
  id: uuid("id").primaryKey().defaultRandom(),
  /** The id of the referenced file */
  fileId: uuid("fileId")
    .notNull()
    .references(() => files.id),
  /** The runtime to use for the file */
  runtime: varchar("runtime").notNull(),
});

export const executableFilesRelations = relations(
  executableFiles,
  ({ one, many }) => ({
    file: one(files, {
      fields: [executableFiles.id],
      references: [files.id],
      relationName: "fileOnExecutableFile",
    }),
  })
);

export const pipelineScripts = pgTable("pipelineScripts", {
  /** The id of the script */
  id: uuid("id").primaryKey().defaultRandom(),
  /** The name of the script */
  name: varchar("name").notNull(),
  /** The id of the referenced file */
  executableFileId: uuid("executableFileId")
    .notNull()
    .references(() => executableFiles.id),
  /** The question version that this script belongs to */
  questionVersionId: uuid("questionVersionId")
    .notNull()
    .references(() => questionVersions.id),
});

export const pipelineScriptsRelations = relations(
  pipelineScripts,
  ({ one, many }) => ({
    file: one(executableFiles, {
      fields: [pipelineScripts.executableFileId],
      references: [executableFiles.id],
      relationName: "fileOnPipelineScript",
    }),
    questionVersion: one(questionVersions, {
      fields: [pipelineScripts.questionVersionId],
      references: [questionVersions.id],
      relationName: "pipelineScriptOnQuestionVersion",
    }),
    runs: many(pipelineScriptRuns, {
      relationName: "runOnPipelineScript",
    }),
  })
);

export const pipelineScriptRunStatusEnum = pgEnum("script_run_status", [
  "Queued",
  "Executing",
  "Success",
  "Error",
]);

export const pipelineScriptErrorKindEnum = pgEnum("script_run_error_kind", [
  "CompileError",
  "RuntimeError",
  "TimeoutError",
  "ParsingOutputError",
  "FailedToInstallLanguageError",
  "DependentScriptError",
]);

export const pipelineScriptRuns = pgTable(
  "pipelineScriptRuns",
  {
    /** The id of the run */
    id: uuid("id").primaryKey().defaultRandom(),

    /** The composite id of the run (basically a complex cache key), also contains all the run metadata */
    compositeId: json("compositeId").$type<ScriptCompositeId>().primaryKey(),

    /** The status of the run */
    runStatus: pipelineScriptRunStatusEnum("runStatus")
      .notNull()
      .default("Queued"),

    /** The error kind of the run (if any) */
    errorKind: pipelineScriptErrorKindEnum("errorKind"),

    /** The output file */
    outputFileId: uuid("outputFile").references(() => files.id),

    /** The question that this run is associated with */
    questionId: uuid("questionId")
      .notNull()
      .references(() => questions.id),

    /** The submission result that this run could possibly be influencing (optional) */
    submissionResultId: uuid("submissionResultId").references(
      () => submissionResults.id
    ),

    /** The id if othe pipeline script */
    executableId: uuid("executableId")
      .notNull()
      .references(() => executableFiles.id),
  },
  (table) => ({
    compositeIdIndex: uniqueIndex("composite_id_index").on(table.compositeId),
  })
);

export const pipelineScriptRunRelations = relations(
  pipelineScriptRuns,
  ({ one, many }) => ({
    pipelineScript: one(pipelineScripts, {
      fields: [pipelineScriptRuns.executableId],
      references: [pipelineScripts.executableFileId],
      relationName: "runOnPipelineScript",
    }),
    output: one(files, {
      fields: [pipelineScriptRuns.outputFileId],
      references: [files.id],
      relationName: "outputOnPipelineScriptRun",
    }),
    question: one(questions, {
      fields: [pipelineScriptRuns.questionId],
      references: [questions.id],
      relationName: "questionOnPipelineScriptRun",
    }),
    submissionResult: one(submissionResults, {
      fields: [pipelineScriptRuns.submissionResultId],
      references: [submissionResults.id],
      relationName: "submissionResultOnPipelineScriptRun",
    }),
    dependencies: many(scriptRunDependencies, {
      relationName: "runOnScriptRunDependency",
    }),
    dependants: many(scriptRunDependencies, {
      relationName: "previousRunOnScriptRunDependency",
    }),
  })
);

export const scriptRunDependencies = pgTable(
  "scriptRunDependency",
  {
    /** The id of the run */
    runId: uuid("runId")
      .notNull()
      .references(() => pipelineScriptRuns.id),

    /** The id of the run that it depends on */
    previousRunId: uuid("previousRunId")
      .notNull()
      .references(() => pipelineScriptRuns.id),
  },
  (table) => ({
    pk: primaryKey(table.runId, table.previousRunId),
  })
);

export const scriptRunDependencyRelations = relations(
  scriptRunDependencies,
  ({ one }) => ({
    run: one(pipelineScriptRuns, {
      fields: [scriptRunDependencies.runId],
      references: [pipelineScriptRuns.id],
      relationName: "runOnScriptRunDependency",
    }),
    previousRun: one(pipelineScriptRuns, {
      fields: [scriptRunDependencies.previousRunId],
      references: [pipelineScriptRuns.id],
      relationName: "previousRunOnScriptRunDependency",
    }),
  })
);
