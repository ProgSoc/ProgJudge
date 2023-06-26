import { z } from "zod";
import {
  createFileSchema,
  getOrCreateExecutable,
  getOrCreateFile,
} from "./files";
import {
  PipelineSchema,
  PipelineScriptKind,
  pipelineCreateSchema,
  pipelineSchema,
} from "./pipelineConfig";
import db from "../db/db";
import {
  pipelineScripts,
  questionTestCases,
  questionVersions,
  questions,
} from "../db/schema";
import { InferModel } from "drizzle-orm";
import { queueExecutions } from "./queueing";

const createTestCaseSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  file: createFileSchema,
  hidden: z.boolean(),
});

type CreateTestCase = z.infer<typeof createTestCaseSchema>;

const createQuestionVersionSchema = z.object({
  testCases: z.array(createTestCaseSchema),
  pipeline: pipelineCreateSchema,
});

type CreateQuestionVersion = z.infer<typeof createQuestionVersionSchema>;

export async function createQuestionVersion(
  question: CreateQuestionVersion,
  questionId: string
) {
  db.transaction(async (tx) => {
    const pipelineSchema = {
      nodes: question.pipeline.nodes,
      outputNode: question.pipeline.outputNode,
    } satisfies PipelineSchema;

    const createdVersions = await tx
      .insert(questionVersions)
      .values({
        questionId,
        pipelineConfig: pipelineSchema,
      })
      .returning();
    const createdVersion = createdVersions[0];

    // TODO: Do this more parallel? Currently this does everything sequentially
    await createTestCasesForQuestionVersion(
      tx,
      question.testCases,
      questionId,
      createdVersion.id
    );

    await createPipelineScriptsForQuestionVersion(
      tx,
      question,
      questionId,
      createdVersion.id
    );

    await queueExecutions(tx, createdVersion.id);
  });
}

async function createTestCasesForQuestionVersion(
  tx: typeof db,
  testCases: CreateTestCase[],
  questionId: string,
  questionVersionId: string
) {
  const files: InferModel<typeof questionTestCases>[] = [];

  // This loop can't be run in parallel because then we can't guarantee deduplication
  for (const testCase of testCases) {
    const file = await getOrCreateFile(tx, testCase.file, questionId);
    const createdTestCases = await tx
      .insert(questionTestCases)
      .values({
        name: testCase.name,
        displayName: testCase.displayName,
        hidden: testCase.hidden,
        fileId: file.id,
        questionVersionId: questionVersionId,
      })
      .returning();

    files.push(createdTestCases[0]);
  }

  return files;
}

async function createPipelineScriptsForQuestionVersion(
  tx: typeof db,
  question: CreateQuestionVersion,
  questionId: string,
  questionVersionId: string
) {
  const scripts: InferModel<typeof pipelineScripts>[] = [];

  // This loop can't be run in parallel because then we can't guarantee deduplication
  for (const [name, node] of Object.entries(question.pipeline.nodes)) {
    if (node.script.kind == PipelineScriptKind.Submission) {
      // Skip submissions as they're not real atm
      return null;
    }

    // We assume that the script exists, as it's been validated in a previous node
    const executableCreate = question.pipeline.scripts[node.script.scriptName];
    if (!executableCreate) {
      throw new Error(`Script ${node.script.scriptName} not found in pipeline`);
    }

    const executable = await getOrCreateExecutable(
      tx,
      executableCreate,
      questionId
    );

    const createdPipelineScripts = await tx
      .insert(pipelineScripts)
      .values({
        name: name,
        executableFileId: executable.id,
        questionVersionId,
      })
      .returning();

    scripts.push(createdPipelineScripts[0]);
  }

  return scripts;
}
