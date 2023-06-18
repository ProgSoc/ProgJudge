import { z } from "zod";

const AddQuestionSchema = z.object({
    competitionId: z.number(),
    question: z.string(),
    title: z.string(),
    points: z.number().nonnegative().multipleOf(0.5),
    answer: z.string(),
})

export default AddQuestionSchema;