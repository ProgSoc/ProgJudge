import { Queue, Worker as BullWorker } from "bullmq";
import env from "./env";
import { InferModel, eq } from "drizzle-orm";
import { questions, submissions } from "./db/schema";
import { PistonExecuteParams, PistonExecuteResult } from "./libs/piston/piston";
import pistonClient from "./libs/piston/client";
import db from "./db/db";

const redisUrl = new URL(env.REDIS_QUEUE_URL);
const redisDatabase = parseInt(redisUrl.pathname.split("/")[1]) ?? 1;

type Submission = InferModel<typeof submissions> & {
  /** Stdin at time of submission */
  stdin: string;
  /** Language Version */
  version: string;
};

type SubmissionResult = PistonExecuteResult & {
  submissionId: string;
};

// const queue = new Queue<Submission, SubmissionResult, "judging">(
//   "judging" as const,
//   {
//     connection: {
//       host: redisUrl.hostname,
//       port: parseInt(redisUrl.port),
//       password: redisUrl.password,
//       db: redisDatabase,
//     },
//   }
// );

// const worker = new BullWorker<Submission, SubmissionResult, "judging">(
//   "judging",
//   async (job) => {
//     const submission = job.data;

//     const pistonJob = {
//       language: submission.language,
//       files: submission.submission.map((file) => ({
//         content: file,
//       })),
//       stdin: submission.stdin,
//       version: submission.version,
//     } satisfies PistonExecuteParams;

//     const pistonResult = await pistonClient.execute(pistonJob);

//     const result = {
//       ...pistonResult,
//       submissionId: submission.id,
//     } satisfies SubmissionResult;

//     return result;
//   }
// );

// worker.on("completed", async (job) => {
//   const result = job.returnvalue;

//   if (result.compile) {
//     /**
//      * compile.code: Exit code from compile process, or null if signal is not null
//      * compile.signal: Signal from compile process, or null if code is not null
//      */
//     const { signal, code } = result.compile;

//     if ((code !== null && code !== 0) || signal !== null) {
//       await db
//         .update(submissions)
//         .set({
//           status: "Rejected",
//           error: result.compile.output,
//         })
//         .where(eq(submissions.id, result.submissionId));

//       return;
//     }
//   }

//   const { signal, code } = result.run;

//   if ((code !== null && code !== 0) || signal !== null) {
//     await db
//       .update(submissions)
//       .set({
//         status: "Rejected",
//         error: result.run.output,
//       })
//       .where(eq(submissions.id, result.submissionId));

//     return;
//   }

//   const submissionQuestions = await db
//     .select({
//       questionId: submissions.questionId,
//       questionPoints: questions.points,
//       stdout: questions.stdout,
//     })
//     .from(questions)
//     .leftJoin(submissions, eq(submissions.questionId, questions.id))
//     .where(eq(submissions.id, result.submissionId));

//   const submissionQuestion = submissionQuestions.at(0);

//   if (!submissionQuestion) {
//     return;
//   }

//   if (submissionQuestion.stdout !== result.run.output) {
//     await db
//       .update(submissions)
//       .set({
//         status: "Rejected",
//         error: "Incorrect answer",
//       })
//       .where(eq(submissions.id, result.submissionId));

//     return;
//   }

//   await db
//     .update(submissions)
//     .set({
//       status: "Accepted",
//       error: null,
//       points: submissionQuestion.questionPoints ?? 0,
//       result: result.run.output,
//     })
//     .where(eq(submissions.id, result.submissionId));
// });

// export default queue;
