import { z } from "zod";
import {
  NodeOutputFormat,
  PipelineSchema,
  PipelineScriptInputDestKind,
  PipelineScriptInputSourceKind,
  PipelineScriptKind,
} from "./pipelineConfig";
import { UnreachableError } from "../unreachableError";

export type CaseCompositeId = { kind: "file"; fileId: string };
export type ScriptCompositeId = {
  kind: "script";
  scriptFileId: string;
  inputs: Record<string, CompositeId>;
  output: NodeOutputFormat;
};

export type CompositeId = CaseCompositeId | ScriptCompositeId;

export function makeInputCompositeId(inputId: string): CaseCompositeId {
  return { kind: "file", fileId: inputId };
}

export function makeScriptCompositeId(
  scriptFileId: string,
  inputs: Record<string, CompositeId>,
  output: NodeOutputFormat
): ScriptCompositeId {
  // Sort the file inputs map by key. This is important for normalization.
  const sortedInputs: Record<string, CompositeId> = {};
  Object.keys(inputs)
    .sort()
    .forEach((key) => {
      sortedInputs[key] = inputs[key];
    });

  return { kind: "script", scriptFileId, inputs: sortedInputs, output };
}

export function getCompositeIdDependencies(id: CompositeId): CompositeId[] {
  const result: CompositeId[] = [];

  if (id.kind === "file") {
    return result;
  }

  for (const inputId of Object.values(id.inputs)) {
    result.push(inputId);
  }

  return result;
}

export function getCompositeIdScriptDependencies(
  id: CompositeId
): ScriptCompositeId[] {
  return getCompositeIdDependencies(id).filter(
    (x): x is ScriptCompositeId => x.kind === "script"
  );
}

export function compositeIdAsString(compositeId: CompositeId): string {
  return JSON.stringify(compositeId);
}

export function getCompositeIdDepth(compositeId: CompositeId): number {
  let max = 0;
  for (const inputId of getCompositeIdDependencies(compositeId)) {
    max = Math.max(max, getCompositeIdDepth(inputId));
  }
  return max + 1;
}

export function sortCompositeIdsByDepth<T extends CompositeId>(
  compositeIds: T[]
): T[] {
  // Map into tuples with depth
  const compositeIdsWithDepth = compositeIds.map((id) => ({
    id,
    depth: getCompositeIdDepth(id),
  }));

  // Sort by depth
  compositeIdsWithDepth.sort((a, b) => b.depth - a.depth);

  // Map back to just ids
  return compositeIdsWithDepth.map((x) => x.id);
}

export function buildAllIdsForPipeline(
  pipeline: PipelineSchema,
  mapScriptNameToId: Record<string, string>,
  caseFileId: string,
  userScriptId?: string
): Record<string, ScriptCompositeId> {
  const nodeNameToIdMap: Record<string, ScriptCompositeId | null> = {};

  for (const [nodeName, node] of Object.entries(pipeline.nodes)) {
    // If this node is already processed, continue
    if (nodeNameToIdMap[nodeName]) {
      continue;
    }

    recursiveBuildAllIdsForPipeline(
      nodeNameToIdMap,
      pipeline,
      mapScriptNameToId,
      nodeName,
      caseFileId,
      userScriptId
    );
  }

  // Remove all nulls
  const result: Record<string, ScriptCompositeId> = {};
  for (const [nodeName, id] of Object.entries(nodeNameToIdMap)) {
    if (id) {
      result[nodeName] = id;
    }
  }

  return result;
}

export function recursiveBuildAllIdsForPipeline(
  nodeIds: Record<string, ScriptCompositeId | null>,
  pipeline: PipelineSchema,
  mapScriptNameToId: Record<string, string>,
  forNode: string,
  caseFileId: string,
  userScriptId?: string
): ScriptCompositeId | null {
  // If we already have it in the map, return it
  if (nodeIds[forNode]) {
    return nodeIds[forNode];
  }

  const nodeData = pipeline.nodes[forNode];
  if (!nodeData) {
    throw new Error(`Node ${forNode} not found in pipeline`);
  }

  // Get the current script ID, which has a special case for submission scripts
  let currentScriptId: string;
  switch (nodeData.script.kind) {
    case PipelineScriptKind.Script: {
      currentScriptId = mapScriptNameToId[nodeData.script.scriptName];
      break;
    }
    case PipelineScriptKind.Submission: {
      // Anything that depends on a submission while a submission isnt provided
      // should be null
      if (!userScriptId) {
        // Mark the current node as null in the map
        nodeIds[forNode] = null;

        return null;
      }
      currentScriptId = userScriptId;
      break;
    }
    default: {
      throw new UnreachableError(nodeData.script);
    }
  }

  const fileInputsMap: Record<string, CompositeId> = {};

  for (let input of nodeData.inputs) {
    // Get the ID of the input
    let id: CompositeId;
    switch (input.source.kind) {
      case PipelineScriptInputSourceKind.TestCase: {
        id = makeInputCompositeId(caseFileId);
        break;
      }
      case PipelineScriptInputSourceKind.Stdout: {
        const result = recursiveBuildAllIdsForPipeline(
          nodeIds,
          pipeline,
          mapScriptNameToId,
          input.source.sourceScriptName,
          caseFileId,
          userScriptId
        );

        // If we recieved null, it means a child depends on a user script which was not provided
        // Hence we return null here too
        if (!result) {
          // Add it to the map too
          nodeIds[forNode] = null;

          return null;
        }

        id = result;
        break;
      }
      default: {
        throw new UnreachableError(input.source);
      }
    }

    // Save the id to the map

    switch (input.destination.kind) {
      case PipelineScriptInputDestKind.Stdin: {
        // Stdin is always "-" as the filename
        fileInputsMap["-"] = id;
        break;
      }
      case PipelineScriptInputDestKind.File: {
        fileInputsMap[input.destination.path] = id;
        break;
      }
      default: {
        throw new UnreachableError(input.destination);
      }
    }
  }

  const compositeId = makeScriptCompositeId(
    currentScriptId,
    fileInputsMap,
    nodeData.output
  );

  // Save it to the map
  nodeIds[forNode] = compositeId;

  return compositeId;
}
