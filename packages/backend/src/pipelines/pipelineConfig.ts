import { z } from "zod";
import { createExecutableSchema } from "./files";

export enum PipelineScriptInputDestKind {
  Stdin = "stdin",
  File = "file",
}

const pipelineScriptInputDestinationSchema = z.union([
  z.object({
    kind: z.literal(PipelineScriptInputDestKind.Stdin),
  }),
  z.object({
    kind: z.literal(PipelineScriptInputDestKind.File),
    path: z.string(),
  }),
]);

export enum PipelineScriptInputSourceKind {
  TestCase = "test-case",
  Stdout = "stdout",
}

const pipelineScriptInputSourceSchema = z.union([
  z.object({
    kind: z.literal(PipelineScriptInputSourceKind.TestCase),
  }),
  z.object({
    kind: z.literal(PipelineScriptInputSourceKind.Stdout),
    sourceScriptName: z.string(),
  }),
]);

const pipelineInputSchema = z.object({
  destination: pipelineScriptInputDestinationSchema,
  source: pipelineScriptInputSourceSchema,
});

export enum PipelineScriptKind {
  Script = "script",
  Submission = "submission",
}

const pipelinePreviewOutputConfig = z.object({
  previewName: z.string(),
});

const pipelineScriptKindSchema = z.union([
  z.object({
    kind: z.literal(PipelineScriptKind.Script),
    scriptName: z.string(),
    previewOutput: pipelinePreviewOutputConfig.optional(),
  }),
  z.object({
    kind: z.literal(PipelineScriptKind.Submission),
  }),
]);

export const nodeOutputFormatSchema = z.union([
  z.literal("utf8"),
  z.literal("base64"),
]);

export type NodeOutputFormat = z.infer<typeof nodeOutputFormatSchema>;

const pipelineNodeSchema = z.object({
  script: pipelineScriptKindSchema,
  output: nodeOutputFormatSchema,
  inputs: z.array(pipelineInputSchema),
  runTimeoutMs: z.number().positive(),
  compileTimeoutMs: z.number().positive(),
  runMemoryLimitBytes: z.number().positive(),
  compileMemoryLimitBytes: z.number().positive(),
});

export const pipelineSchema = z.object({
  nodes: z.record(z.string(), pipelineNodeSchema),
  outputNode: z.string(),
});

export type PipelineSchema = z.infer<typeof pipelineSchema>;

export const pipelineCreateSchema = z.object({
  nodes: z.record(z.string(), pipelineNodeSchema),
  outputNode: z.string(),
  scripts: z.record(z.string(), createExecutableSchema),
});

export type PipelineCreateSchema = z.infer<typeof pipelineCreateSchema>;
