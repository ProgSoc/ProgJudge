import { Client as MinioClient } from "minio";

const minioClient = new MinioClient({
  endPoint: "localhost",
  port: 9000,
  useSSL: false,

  // TODO: Put these into env
  accessKey: "EPvUDNGNCvaSQO8dVvcf",
  secretKey: "gHKJm1qksKJkVaMgH99aBDeFPTSolhNOCYfIFgDE",
});

const bucketName = "progjudge";

export async function minioUploadFile(ref: string, buffer: Buffer) {
  await minioClient.putObject(bucketName, ref, buffer);
}

export async function minioDownloadFile(ref: string) {
  const readable = await minioClient.getObject(bucketName, ref);
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
