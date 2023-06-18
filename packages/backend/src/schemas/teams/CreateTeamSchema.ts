import { z } from "zod";

const CreateTeamSchema = z.object({
    name: z.string(),
    competitionId: z.number(),
});

export default CreateTeamSchema;