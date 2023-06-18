import { z } from "zod";

const AddTeamMemberSchema = z.object({
    teamId: z.number(),
    userId: z.number(),
});

export default AddTeamMemberSchema;