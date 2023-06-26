import { run } from "node:test";
import db from "../db/db";
import {
  pipelineScriptErrorKindEnum,
  pipelineScriptRunRelations,
  pipelineScriptRunStatusEnum,
  pipelineScriptRuns,
  scriptRunDependencies,
} from "../db/schema";
import {
  InferModel,
  eq,
  notExists,
  ne,
  and,
  exists,
  WithEnum,
} from "drizzle-orm";
import { getExecutableById, getOrCreateFile } from "./files";
import buffermime from "file-type";
import pistonClient from "../libs/piston/client";
import { PistonPackageResult } from "../libs/piston/piston";
import AsyncLock from "async-lock";

type ScriptRun = InferModel<typeof pipelineScriptRuns>;

type ScriptErrorKind = NonNullable<
  InferModel<typeof pipelineScriptRuns>["errorKind"]
>;

const fetchNextQueuedRuns = db
  .select()
  .from(pipelineScriptRuns)
  .where((run) =>
    and(
      eq(run.runStatus, "Queued"),
      notExists(
        db
          .select()
          .from(scriptRunDependencies)
          .leftJoin(
            pipelineScriptRuns,
            eq(pipelineScriptRuns.id, scriptRunDependencies.previousRunId)
          )
          .where((data) =>
            and(
              eq(data.pipelineScriptRuns.id, run.id),
              ne(data.pipelineScriptRuns.runStatus, "Success")
            )
          )
      )
    )
  )
  .prepare("fetch_next_queued_runs");

const getScriptsWithErroredParents = db
  .select()
  .from(pipelineScriptRuns)
  .where((run) =>
    and(
      eq(run.runStatus, "Queued"),
      exists(
        db
          .select()
          .from(scriptRunDependencies)
          .leftJoin(
            pipelineScriptRuns,
            eq(pipelineScriptRuns.id, scriptRunDependencies.previousRunId)
          )
          .where((data) =>
            and(
              eq(data.pipelineScriptRuns.id, run.id),
              ne(data.pipelineScriptRuns.runStatus, "Error")
            )
          )
      )
    )
  )
  .prepare("get_scripts_with_errored_parents");

let spawned = false;
class ExecutionLoop {
  pistonPackagesPromise = pistonClient.getPackages();
  addedPackages: PistonPackageResult[] = [];

  packageInstallLock = new AsyncLock();
  scriptRunLock = new AsyncLock();

  static spawn() {
    return new ExecutionLoop();
  }

  private constructor() {
    if (spawned) {
      throw new Error("ExecutionLoop already spawned");
    }
    spawned = true;
    void this.spawnExecutionLoop();
  }

  async spawnExecutionLoop() {
    await this.convertAllExecutingIntoPending();

    while (true) {
      const pendingRuns = await fetchNextQueuedRuns.execute();

      await Promise.all(
        pendingRuns.map(async (run) => {
          await this.executeRun(run);
        })
      );
    }
  }

  async executeRun(run: ScriptRun) {
    await this.markRunAsExecuting(run);

    const executable = await getExecutableById(run.executableId);
    await this.ensurePackageInstalled(executable.runtime);

    const { lang, version } = getRuntimeParams(executable.runtime);

    const result = await pistonClient.execute({
      language: lang,
      version: version,
      files: [
        {
          content: executable.file.data.toString("base64"),
          name: executable.file.filename,
          encoding: "base64",
        },
      ],
    });

    console.log(result);
    throw new Error("Not implemented");
    // TODO: Process the result here
  }

  async ensurePackageInstalled(
    runtime: string
  ): Promise<"installed" | "failed"> {
    const { lang, version } = getRuntimeParams(runtime);

    const packages = await this.pistonPackagesPromise;

    const packageToInstall = packages.find(
      (pkg) => pkg.language === lang && pkg.language_version === version
    );

    if (!packageToInstall) {
      return "failed";
    }

    if (packageToInstall.installed) {
      return "installed";
    }

    const alreadyInstalled = this.addedPackages.find(
      (pkg) => pkg.language === lang && pkg.language_version === version
    );

    if (alreadyInstalled) {
      return "installed";
    }

    return this.packageInstallLock.acquire("install", async () => {
      try {
        await pistonClient.installPackage({
          language: lang,
          version: version,
        });
        packageToInstall.installed = true;
        this.addedPackages.push(packageToInstall);
        return "installed";
      } catch (e) {
        return "failed";
      }
    });
  }

  // If the server died while executing, we need to convert all executing runs into pending runs
  async convertAllExecutingIntoPending() {
    await db
      .update(pipelineScriptRuns)
      .set({
        runStatus: "Queued",
      })
      .where(eq(pipelineScriptRuns.runStatus, "Executing"));
  }

  async fetchNextPendingRuns() {
    // Fetch all runs where all the dependencies are complete
    return fetchNextQueuedRuns.execute();
  }

  async propagateErroredRuns() {
    while (true) {
      const erroredRuns = await getScriptsWithErroredParents.execute();
      if (erroredRuns.length === 0) {
        break;
      }

      // For each errored run, we need to mark it as errored and propagate the error to all the runs that depend on it
      await Promise.all(
        erroredRuns.map(async (run) => {
          await this.markRunAsErrored(
            run,
            "DependentScriptError",
            Buffer.from("A dependent run failed")
          );
        })
      );
    }
  }

  async markRunAsExecuting(run: ScriptRun) {
    await db
      .update(pipelineScriptRuns)
      .set({
        runStatus: "Executing",
      })
      .where(eq(pipelineScriptRuns.id, run.id));
    // TODO: Notification system
  }

  async markRunAsErrored(
    run: ScriptRun,
    errorKind: ScriptErrorKind,
    error: Buffer
  ) {
    const extAndMime = await getExtAndMimeFromBuffer(error);

    db.transaction(async (tx) => {
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

    // TODO: Notification system
  }

  async markRunAsFinished(run: ScriptRun, output: string) {
    const extAndMime = await getExtAndMimeFromBuffer(Buffer.from(output));

    db.transaction(async (tx) => {
      const file = await getOrCreateFile(
        tx,
        {
          filename: `output.${extAndMime.ext}`,
          mime: extAndMime.mime,
          data: Buffer.from(output),
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
    });

    // TODO: Notification system
  }
}

async function getExtAndMimeFromBuffer(buffer: Buffer) {
  const type = await buffermime.fileTypeFromBuffer(buffer);
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

export function getRuntimeParams(runtime: string) {
  const [lang, version] = runtime.split(":");
  return {
    lang,
    version,
  };
}
