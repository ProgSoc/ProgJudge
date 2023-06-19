import { z } from "zod";

const EditCompetitionSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    start: z.string().datetime(),
    end: z.string().datetime(),
    languages: z.array(z.string()),
    status: z.enum(["Pending", "Active", "Completed"]),
})

export default EditCompetitionSchema;