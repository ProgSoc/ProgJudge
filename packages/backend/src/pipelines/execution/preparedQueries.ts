import { and, eq, notExists, ne, exists } from "drizzle-orm";
import db from "../../db/db";
import { pipelineScriptRuns, scriptRunDependencies } from "../../db/schema";

const runs = db.select().from(pipelineScriptRuns).as("run");

// Feteches any queued run where all of its parents have succeeded
export const fetchNextQueuedRuns = db
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

// Fetches any queued run where any of its parents have errored
export const getScriptsWithErroredParents = db
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
