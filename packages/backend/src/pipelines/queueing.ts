import db from "../db/db";
import { pipelineScriptRuns, scriptRunDependencies } from "../db/schema";
import {
  CompositeId,
  ScriptCompositeId,
  buildAllIdsForPipeline,
  compositeIdAsString,
  getCompositeIdScriptDependencies,
  sortCompositeIdsByDepth,
} from "./composition";
import { PipelineSchema } from "./pipelineConfig";

export type SubmissionScriptAndResult = {
  scriptId: string;
  submissionResultId: string;
};

export async function queueExecutions(
  tx: typeof db,
  questionVersionId: string,
  submission?: SubmissionScriptAndResult
) {
  const questionVersion = await tx.query.questionVersions.findFirst({
    where: (questionVersion, { eq }) =>
      eq(questionVersion.id, questionVersionId),
  });

  if (!questionVersion) {
    throw new Error("Question version not found");
  }

  const questionTestCases = await tx.query.questionTestCases.findMany({
    where: (questionTestCase, { eq }) =>
      eq(questionTestCase.questionVersionId, questionVersionId),
  });
  const questionScripts = await tx.query.pipelineScripts.findMany({
    where: (questionTestCase, { eq }) =>
      eq(questionTestCase.questionVersionId, questionVersionId),
  });

  const testCaseFileIds = questionTestCases.map((testCase) => testCase.fileId);

  const scriptNameToIdMap = Object.fromEntries(
    questionScripts.map((script) => [script.name, script.executableFileId])
  );

  await Promise.all(
    testCaseFileIds.map(async (fileId) => {
      const ids = buildAllIdsForPipeline(
        questionVersion.pipelineConfig,
        scriptNameToIdMap,
        fileId,
        submission?.scriptId
      );

      await queueExecutionsIntoDb(
        tx,
        questionVersion.questionId,
        Object.values(ids),
        ids[questionVersion.pipelineConfig.outputNode]
      );
    })
  );
}

export async function queueExecutionsIntoDb(
  tx: typeof db,
  questionId: string,
  runs: ScriptCompositeId[],
  outputRun?: ScriptCompositeId, // Run that generates the final judging output. Also contained within the runs array.
  submissionResultId?: string
) {
  // When sorting by depth, we ensure that dependencies are always
  // inserted before the scripts that depend on them
  const sortedRuns = sortCompositeIdsByDepth(runs);

  for (const run of sortedRuns) {
    const dependentIds = getCompositeIdScriptDependencies(run);

    // Grab all the dependencies for this run
    const dependentRuns = await Promise.all(
      dependentIds.map(async (id) => {
        const idStr = compositeIdAsString(id);
        return tx.query.pipelineScriptRuns.findFirst({
          where: (run, { and, eq }) =>
            and(eq(run.compositeId, idStr), eq(run.questionId, questionId)),
        });
      })
    );

    // If the dependency is not found, we are in an invalid state. All dependencies must be present
    // to create this.
    const depenentRunsFiltered = dependentRuns.filter(
      <T>(x: T | undefined): x is T => {
        if (!x) {
          throw new Error("Dependent run not found, this is an invalid state");
        }
        return true;
      }
    );

    // Insert the run
    const insertedRuns = await tx
      .insert(pipelineScriptRuns)
      .values({
        compositeId: compositeIdAsString(run),
        questionId,
        submissionResultId: outputRun === run ? submissionResultId : undefined,
        executableId: run.scriptFileId,
      })
      .returning();
    const insertedRun = insertedRuns[0];

    // Insert the dependency relationships
    await Promise.all(
      depenentRunsFiltered.map(async (dependentRun) => {
        await tx
          .insert(scriptRunDependencies)
          .values({
            runId: insertedRun.id,
            previousRunId: dependentRun.id,
          })
          .returning();
      })
    );
  }
}
