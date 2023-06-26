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
import { getExecutableById, getFileById, getOrCreateFile } from "./files";
import { fileTypeFromBuffer } from "file-type";
import pistonClient from "../libs/piston/client";
import { PistonPackageResult } from "../libs/piston/piston";
import AsyncLock from "async-lock";
import {
  CompositeId,
  compositeIdFromString,
  compositeIdAsString,
  getCompositeIdDependencies,
} from "./composition";
import { UnreachableError } from "../unreachableError";

type ScriptRun = InferModel<typeof pipelineScriptRuns>;

type ScriptErrorKind = NonNullable<
  InferModel<typeof pipelineScriptRuns>["errorKind"]
>;

const runs = db.select().from(pipelineScriptRuns).as("run");

const fetchNextQueuedRuns = db
  .select()
  .from(runs)
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
              eq(data.script_run_dependency.runId, run.id),
              ne(data.pipeline_script_runs.runStatus, "Success")
            )
          )
      )
    )
  )
  .prepare("fetch_next_queued_runs");

console.log(
  db
    .select()
    .from(runs)
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
                eq(data.script_run_dependency.runId, run.id),
                ne(data.pipeline_script_runs.runStatus, "Success")
              )
            )
        )
      )
    )
    .toSQL()
);

const getScriptsWithErroredParents = db
  .select()
  .from(runs)
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
              eq(data.script_run_dependency.runId, run.id),
              eq(data.pipeline_script_runs.runStatus, "Error")
            )
          )
      )
    )
  )
  .prepare("get_scripts_with_errored_parents");

let spawned = false;
export class ExecutionLoop {
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
      await this.propagateErroredRuns();

      const pendingRuns = await fetchNextQueuedRuns.execute();

      if (pendingRuns.length === 0) {
        // Quick timeout to not spam the database
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

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
    const installResult = await this.ensurePackageInstalled(executable.runtime);

    if (installResult == "failed") {
      await this.markRunAsErrored(
        run,
        "FailedToInstallLanguageError",
        Buffer.from(
          `Failed to locate/install install package ${executable.runtime}`
        )
      );
      return;
    }

    const compositeId = compositeIdFromString(run.compositeId);
    const inputs = compositeId.inputs;

    let stdin: Buffer | undefined;
    const otherFiles: Record<string, Buffer> = {};

    await Promise.all(
      Object.entries(inputs).map(async ([name, id]) => {
        const buffer = await getInputFromId(id);

        if (name === "-") {
          stdin = buffer;
        } else {
          otherFiles[name] = buffer;
        }
      })
    );

    // TODO: Validate that stdin is valid utf-8

    const { lang, version } = getRuntimeParams(executable.runtime);

    const result = await this.scriptRunLock.acquire("lock", async () => {
      return pistonClient.execute({
        language: lang,
        version: version,
        files: [
          {
            content: executable.file.data.toString(),
            name: executable.file.filename,
            encoding: "utf8",
          },
          ...Object.entries(otherFiles).map(([name, buffer]) => ({
            content: buffer.toString("base64"),
            name,
            encoding: "base64",
          })),
        ],
        stdin: stdin?.toString(),
      });
    });

    if (result.compile) {
      if (result.compile.code !== 0) {
        await this.markRunAsErrored(
          run,
          "CompileError",
          Buffer.from(result.compile.output)
        );
        return;
      }
    }

    if (result.run.code !== 0) {
      await this.markRunAsErrored(
        run,
        "RuntimeError",
        Buffer.from(result.run.output)
      );
      return;
    }

    let output: Buffer;
    switch (compositeId.output) {
      case "base64": {
        output = Buffer.from(result.run.output, "base64");
        break;
      }
      case "utf8": {
        output = Buffer.from(result.run.output, "utf8");
        break;
      }
      default: {
        throw new UnreachableError(compositeId.output);
      }
    }

    await this.markRunAsFinished(run, output);
  }

  async ensurePackageInstalled(pkg: string): Promise<"installed" | "failed"> {
    const { lang, runtime, version } = getRuntimeParams(pkg);

    return this.packageInstallLock.acquire(pkg, async () => {
      const packages = await this.pistonPackagesPromise;

      const packageToInstall = packages.find(
        (pkg) => pkg.language === runtime && pkg.language_version === version
      );

      if (!packageToInstall) {
        console.log("Package not found", pkg);
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

      try {
        console.log("Installing package", pkg);
        await pistonClient.installPackage({
          language: runtime,
          version: version,
        });
        packageToInstall.installed = true;
        this.addedPackages.push(packageToInstall);
        return "installed";
      } catch (e) {
        console.log("Failed to install package", pkg, e);
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

    await db.transaction(async (tx) => {
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

    console.log("Marked run as errored", run.compositeId);
    console.log("Error:\n" + error.toString());
    // TODO: Notification system
  }

  async markRunAsFinished(run: ScriptRun, output: Buffer) {
    const extAndMime = await getExtAndMimeFromBuffer(output);

    await db.transaction(async (tx) => {
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
    });

    console.log("Marked run as finished", run.compositeId);
    console.log("Output:\n" + output.toString());
    // TODO: Notification system
  }
}

async function getInputFromId(id: CompositeId): Promise<Buffer> {
  switch (id.kind) {
    case "file": {
      const file = await getFileById(id.fileId);
      return file.data;
    }
    case "script": {
      const idStr = compositeIdAsString(id);
      const script = await db.query.pipelineScriptRuns.findFirst({
        where: (r, { eq }) => eq(r.compositeId, idStr),
      });

      if (!script) {
        throw new Error(
          `Script with composite id ${idStr} not found while requesting its output. This is an invalid state.`
        );
      }

      if (!script.outputFileId) {
        throw new Error(
          `Script with composite id ${idStr} does not have an output file. This is an invalid state.`
        );
      }

      const file = await getFileById(script.outputFileId);
      return file.data;
    }
    default: {
      throw new UnreachableError(id);
    }
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

export function getRuntimeParams(languageName: string) {
  const [langpath, version] = languageName.split(":");

  const langsplit = langpath.split("/");

  let lang = langsplit[0];
  let runtime = langsplit[0];
  if (langsplit.length == 2) {
    lang = langsplit[1];
    runtime = langsplit[0];
  }

  return {
    lang,
    runtime,
    version,
  };
}
