import { z } from "zod";

const RegisterSchema = z.object({
    username: z.string().min(4),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
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