import { z } from "zod";

const CreateCompetitionSchema = z.object({
    name: z.string(),
    description: z.string(),
    start: z.string().datetime(),
    end: z.string().datetime(),
    languages: z.array(z.string()),
})

export default CreateCompetitionSchema;