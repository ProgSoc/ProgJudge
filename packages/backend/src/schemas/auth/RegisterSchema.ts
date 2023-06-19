import { z } from "zod";

const RegisterSchema = z.object({
    username: z.string(),
    password: z.string(),
    confirmPassword: z.string(),
}).superRefine(({confirmPassword, password}, ctx) => {
    if (password !== confirmPassword) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Passwords do not match",
            path: ["confirmPassword"],
        });
    }
})

export default RegisterSchema;