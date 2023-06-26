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
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id),
});

export const filesRelations = relations(files, ({ one, many }) => ({
  question: one(questions, {
    fields: [files.questionId],
    references: [questions.id],
    relationName: "file_on_question",
  }),
}));

export const executableFiles = pgTable("executable_files", {
  /** The id of the file */
  id: uuid("id").primaryKey().defaultRandom(),
  /** The id of the referenced file */
  fileId: uuid("file_id")
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
      relationName: "file_on_executable_file",
    }),
  })
);

export const pipelineScripts = pgTable("pipeline_scripts", {
  /** The id of the script */
  id: uuid("id").primaryKey().defaultRandom(),
  /** The name of the script */
  name: varchar("name").notNull(),
  /** The id of the referenced file */
  executableFileId: uuid("executable_file_id")
    .notNull()
    .references(() => executableFiles.id),
  /** The question version that this script belongs to */
  questionVersionId: uuid("question_version_id")
    .notNull()
    .references(() => questionVersions.id),
});

export const pipelineScriptsRelations = relations(
  pipelineScripts,
  ({ one, many }) => ({
    file: one(executableFiles, {
      fields: [pipelineScripts.executableFileId],
      references: [executableFiles.id],
      relationName: "file_on_pipeline_script",
    }),
    questionVersion: one(questionVersions, {
      fields: [pipelineScripts.questionVersionId],
      references: [questionVersions.id],
      relationName: "pipeline_script_on_question_version",
    }),
    runs: many(pipelineScriptRuns, {
      relationName: "run_on_pipeline_script",
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
    compositeId: json("composite_id").$type<ScriptCompositeId>().primaryKey(),

    /** The status of the run */
    runStatus: pipelineScriptRunStatusEnum("run_status")
      .notNull()
      .default("Queued"),

    /** The error kind of the run (if any) */
    errorKind: pipelineScriptErrorKindEnum("error_kind"),

    /** The output file */
    outputFileId: uuid("output_file").references(() => files.id),

    /** The question that this run is associated with */
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id),

    /** The submission result that this run could possibly be influencing (optional) */
    submissionResultId: uuid("submission_result_id").references(
      () => submissionResults.id
    ),

    /** The id if othe pipeline script */
    executableId: uuid("executable_id")
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
      relationName: "run_on_pipeline_script",
    }),
    output: one(files, {
      fields: [pipelineScriptRuns.outputFileId],
      references: [files.id],
      relationName: "output_on_pipeline_script_run",
    }),
    question: one(questions, {
      fields: [pipelineScriptRuns.questionId],
      references: [questions.id],
      relationName: "question_on_pipeline_script_run",
    }),
    submissionResult: one(submissionResults, {
      fields: [pipelineScriptRuns.submissionResultId],
      references: [submissionResults.id],
      relationName: "submission_result_on_pipeline_script_run",
    }),
    dependencies: many(scriptRunDependencies, {
      relationName: "run_on_script_run_dependency",
    }),
    dependants: many(scriptRunDependencies, {
      relationName: "previous_run_on_script_run_dependency",
    }),
  })
);

export const scriptRunDependencies = pgTable(
  "scriptRunDependency",
  {
    /** The id of the run */
    runId: uuid("run_id")
      .notNull()
      .references(() => pipelineScriptRuns.id),

    /** The id of the run that it depends on */
    previousRunId: uuid("previous_run_id")
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
      relationName: "run_on_script_run_dependency",
    }),
    previousRun: one(pipelineScriptRuns, {
      fields: [scriptRunDependencies.previousRunId],
      references: [pipelineScriptRuns.id],
      relationName: "previous_run_on_script_run_dependency",
    }),
  })
);
