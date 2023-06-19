import { z } from "zod";

const AddTeamMemberSchema = z.object({
    teamId: z.string(),
    userId: z.string(),
});

export default AddTeamMemberSchema;