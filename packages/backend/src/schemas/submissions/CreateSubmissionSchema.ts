import { z } from "zod";

const FileSchema = z.object({
    name: z.string(),
    encoding: z.string(),
    content: z.string(),
    entryPoint: z.boolean(),
});

const CreateSubmissionSchema = z.object({
    teamId: z.string(),
    questionId: z.string(),
    files: z.array(FileSchema),
    language: z.string(),
});

export default CreateSubmissionSchema;