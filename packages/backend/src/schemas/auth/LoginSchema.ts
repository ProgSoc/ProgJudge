import { z } from "zod";

const LoginSchema = z.object({
    username: z.string().min(4),
    password: z.string().min(8),
})

export default LoginSchema;