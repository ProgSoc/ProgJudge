import { createHash } from "node:crypto";
import { z } from "zod";
import { pipelineSchema } from "./pipelineConfig";
import db from "../db/db";
import { executableFiles, files } from "../db/schema";
import mime from "mime-types";
import { minioDownloadFile, minioUploadFile } from "../libs/minio";

export const createFileSchema = z.object({
  filename: z.string(),
  data: z.instanceof(Buffer),
  mime: z.string(),
});

type CreateFile = z.infer<typeof createFileSchema>;

export const createExecutableSchema = z.object({
  filename: z.string(),
  data: z.instanceof(Buffer),
  runtime: z.string(),
});

type CreateExecutable = z.infer<typeof createExecutableSchema>;

function sha256(content: Buffer) {
  return createHash("sha256").update(content).digest("hex");
}

const testS3FilesDict: Record<string, Buffer> = {};

async function saveFileToS3(ref: string, data: Buffer) {
  return minioUploadFile(ref, data);
}

async function getFileFromS3(ref: string): Promise<Buffer> {
  return minioDownloadFile(ref);
}

export async function getOrCreateFile(
  tx: typeof db,
  file: CreateFile,
  questionId: string
) {
  const hash = sha256(Buffer.from(file.data));
  const filesize = Buffer.byteLength(file.data);
  const foundFile = await db.query.files.findFirst({
    where: (file, { eq, and }) =>
      and(
        eq(file.hash, hash),
        eq(file.size, filesize),
        eq(file.questionId, questionId)
      ),
  });

  if (foundFile) {
    return foundFile;
  }

  const fileExt = file.filename.split(".").pop();
  const hashFilename = fileExt ? `${hash}.${fileExt}` : hash;
  const ref = `questions/${questionId}/${file.filename}/${hashFilename}`;

  const createdFile = await tx
    .insert(files)
    .values({
      filename: file.filename,
      hash,
      size: filesize,
      mimetype: file.mime,
      ref,
      questionId,
    })
    .returning();

  await saveFileToS3(ref, file.data);

  return createdFile[0];
}

export async function getFileById(id: string) {
  const file = await db.query.files.findFirst({
    where: (file, { eq }) => eq(file.id, id),
  });

  if (!file) {
    throw new Error(`File ${id} not found`);
  }

  const data = await getFileFromS3(file.ref);

  return {
    ...file,
    data,
  };
}

export async function getOrCreateExecutable(
  tx: typeof db,
  executable: CreateExecutable,
  questionId: string
) {
  const mimeType = mime.lookup(executable.filename) || "text/plain";

  const file = await getOrCreateFile(
    tx,
    {
      filename: executable.filename,
      mime: mimeType,
      data: executable.data,
    },
    questionId
  );

  const foundExecutable = await tx.query.executableFiles.findFirst({
    where: (executable, { eq, and }) =>
      and(
        eq(executable.fileId, file.id),
        eq(executable.runtime, executable.runtime)
      ),
    with: {
      file: true,
    },
  });

  type Return = NonNullable<typeof foundExecutable>;

  if (foundExecutable) {
    return foundExecutable;
  }

  const createdExecutable = await tx
    .insert(executableFiles)
    .values({
      fileId: file.id,
      runtime: executable.runtime,
    })
    .returning();

  return {
    ...createdExecutable[0],
    file,
  } satisfies Return;
}

export async function getExecutableById(id: string) {
  const executable = await db.query.executableFiles.findFirst({
    where: (executable, { eq }) => eq(executable.id, id),
    with: {
      file: true,
    },
  });

  if (!executable) {
    throw new Error(`Executable ${id} not found`);
  }

  return {
    ...executable,
    file: {
      ...executable.file,
      data: await getFileFromS3(executable.file.ref),
    },
  };
}
