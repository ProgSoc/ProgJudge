import { InferModel, eq } from "drizzle-orm";
import { Db } from "../../db/db";
import { pipelineScriptRuns, scriptRunDependencies } from "../../db/schema";
import { getOrCreateFile } from "../files";
import { fileTypeFromBuffer } from "file-type";
import {
  CompositeId,
  ScriptCompositeId,
  compositeIdAsString,
  compositeIdFromString,
  getCompositeIdScriptDependencies,
} from "../composition";

type ScriptRun = InferModel<typeof pipelineScriptRuns>;

type ScriptErrorKind = NonNullable<
  InferModel<typeof pipelineScriptRuns>["errorKind"]
>;

// FIXME: Extract these run state types into a separate file

type RunStateFinished = {
  kind: "finished";
  resultFileId: string;
};

type RunStateErrored = {
  kind: "errored";
  errorKind: ScriptErrorKind;
};

type RunState =
  | {
      kind: "missing";
    }
  | {
      kind: "queued";
    }
  | {
      kind: "executing";
    }
  | RunStateFinished
  | RunStateErrored;

type EndedRunState = RunStateFinished | RunStateErrored;

export class RunStateManager {
  notifs: StatefulPubSub<string, RunState>;
  db: Db;

  constructor(db: Db) {
    this.db = db;
    this.notifs = new StatefulPubSub(async (compositeIdStr) => {
      return this.getStateForRun(compositeIdStr);
    });
  }

  // This function takes a transaction because
  async createRun(tx: Db, compositeId: ScriptCompositeId, questionId: string) {
    const dependentIds = getCompositeIdScriptDependencies(compositeId);

    const compositeIdStr = compositeIdAsString(compositeId);

    const existingRun = await tx.query.pipelineScriptRuns.findFirst({
      where: (r, { and, eq }) =>
        and(eq(r.compositeId, compositeIdStr), eq(r.questionId, questionId)),
    });

    if (existingRun) {
      return;
    }

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
        compositeId: compositeIdAsString(compositeId),
        questionId,
        submissionResultId: null,
        executableId: compositeId.scriptFileId,
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

    this.notifs.notify(compositeIdStr, {
      kind: "queued",
    });
  }

  async markRunAsExecuting(run: ScriptRun) {
    await this.db
      .update(pipelineScriptRuns)
      .set({
        runStatus: "Executing",
      })
      .where(eq(pipelineScriptRuns.id, run.id));

    this.notifs.notify(run.compositeId, {
      kind: "executing",
    });
  }

  async markRunAsErrored(
    run: ScriptRun,
    errorKind: ScriptErrorKind,
    error: Buffer
  ) {
    const extAndMime = await getExtAndMimeFromBuffer(error);

    await this.db.transaction(async (tx) => {
      const file = await getOrCreateFile(
        tx,
        {
          filename: `error.${extAndMime.ext}`,
          mime: extAndMime.mime,
          data: Buffer.from(error),
        },
        run.questionId
      );

      await tx
        .update(pipelineScriptRuns)
        .set({
          runStatus: "Error",
          errorKind,
          outputFileId: file.id,
        })
        .where(eq(pipelineScriptRuns.id, run.id));
    });

    this.notifs.notify(run.compositeId, {
      kind: "errored",
      errorKind,
    });
  }

  async markRunAsFinished(run: ScriptRun, output: Buffer) {
    const extAndMime = await getExtAndMimeFromBuffer(output);

    const file = await this.db.transaction(async (tx) => {
      const file = await getOrCreateFile(
        tx,
        {
          filename: `output.${extAndMime.ext}`,
          mime: extAndMime.mime,
          data: output,
        },
        run.questionId
      );

      await tx
        .update(pipelineScriptRuns)
        .set({
          runStatus: "Success",
          outputFileId: file.id,
        })
        .where(eq(pipelineScriptRuns.id, run.id));

      return file;
    });

    this.notifs.notify(run.compositeId, {
      kind: "finished",
      resultFileId: file.id,
    });
  }

  async resetRunToQueued(run: ScriptRun) {
    await this.db
      .update(pipelineScriptRuns)
      .set({
        runStatus: "Queued",
        errorKind: null,
      })
      .where(eq(pipelineScriptRuns.id, run.id));

    this.notifs.notify(run.compositeId, {
      kind: "queued",
    });
  }

  async getCurrentRunState(compositeId: ScriptCompositeId): Promise<RunState> {
    const compositeIdStr = compositeIdAsString(compositeId);
    return new Promise((resolve) => {
      const unsub = this.notifs.subscribe(compositeIdStr, (state) => {
        resolve(state);
        unsub();
      });
    });
  }

  async waitForRunToEnd(
    compositeId: ScriptCompositeId
  ): Promise<EndedRunState> {
    const compositeIdStr = compositeIdAsString(compositeId);
    return new Promise((resolve) => {
      const unsub = this.notifs.subscribe(compositeIdStr, (state) => {
        if (state.kind === "finished" || state.kind === "errored") {
          resolve(state);
          unsub();
        }
      });
    });
  }

  async subscribeToRunState(
    compositeId: ScriptCompositeId,
    cb: (state: RunState) => void
  ): Promise<() => void> {
    const compositeIdStr = compositeIdAsString(compositeId);
    return this.notifs.subscribe(compositeIdStr, cb);
  }

  private async getStateForRun(compositeIdStr: string): Promise<RunState> {
    const run = await this.db.query.pipelineScriptRuns.findFirst({
      where: (r, { eq }) => eq(r.compositeId, compositeIdStr),
    });

    if (!run) {
      return {
        kind: "missing",
      };
    }

    if (run.runStatus === "Queued") {
      return {
        kind: "queued",
      };
    }

    if (run.runStatus === "Executing") {
      return {
        kind: "executing",
      };
    }

    if (run.runStatus === "Success") {
      return {
        kind: "finished",
        resultFileId:
          run.outputFileId ?? "output file id is missing, this is invalid",
      };
    }

    if (run.runStatus === "Error") {
      return {
        kind: "errored",
        errorKind:
          run.errorKind ?? ("error kind is missing, this is invalid" as any),
      };
    }

    throw new Error("Invalid run status");
  }
}

async function getExtAndMimeFromBuffer(buffer: Buffer) {
  const type = await fileTypeFromBuffer(buffer);
  if (!type) {
    let isValidUtf8 = true;
    try {
      new TextDecoder("utf8", { fatal: true }).decode(buffer);
    } catch (e) {
      isValidUtf8 = false;
    }

    if (isValidUtf8) {
      return {
        ext: "txt",
        mime: "text/plain",
      };
    } else {
      return {
        ext: "bin",
        mime: "application/octet-stream",
      };
    }
  }
  return {
    ext: type.ext,
    mime: type.mime,
  };
}
