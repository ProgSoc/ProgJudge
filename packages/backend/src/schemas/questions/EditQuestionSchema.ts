import { z } from "zod";

const EditQuestionSchema = z.object({
  id: z.number(),
  question: z.string().optional(),
  title: z.string().optional(),
  points: z.number().nonnegative().multipleOf(0.5).optional(),
  answer: z.string().optional(),
});

export default EditQuestionSchema;
