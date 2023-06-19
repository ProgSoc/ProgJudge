import { z } from "zod";

const AddQuestionSchema = z.object({
    competitionId: z.string(),
    question: z.string(),
    title: z.string(),
    points: z.number().nonnegative().multipleOf(0.5),
    stdin: z.string(),
    stdout: z.string(),
})

export default AddQuestionSchema;