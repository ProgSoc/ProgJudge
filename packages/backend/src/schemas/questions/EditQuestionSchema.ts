import { z } from "zod";

const EditQuestionSchema = z.object({
  id: z.string(),
  question: z.string().optional(),
  title: z.string().optional(),
  points: z.number().nonnegative().multipleOf(0.5).optional(),
  stdout: z.string().optional(),
  stdin: z.string().optional(),
});

export default EditQuestionSchema;
