import { z } from "zod";

const CreateTeamSchema = z.object({
    name: z.string(),
    competitionId: z.string(),
});

export default CreateTeamSchema;