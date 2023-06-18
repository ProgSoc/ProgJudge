import { z} from 'zod'
import { config } from 'dotenv'
config()

const envVariables = z.object({
    /**
     * General
     */
    NODE_ENV: z.string().default('development'),
    PORT: z.number().default(3000),
    SECRET_DB_URL: z.string().url("Needs to be a valid url").default('postgres://postgres:postgres@localhost:5432/postgres'),
    COOKIE_SECRET: z.string().default('secret'),
    REDIS_SESSION_URL: z.string().url("Needs to be a valid url").default('redis://localhost:6379/0'),
    REDIS_QUEUE_URL: z.string().url("Needs to be a valid url").default('redis://localhost:6379/1'),
    SESSION_SECRET: z.string().default('secret'),

    /**
     * Github OAuth
     */
    GITHUB_CLIENT_ID: z.string().default(''),
    GITHUB_CLIENT_SECRET: z.string().default(''),
    GITHUB_CALLBACK_URL: z.string().default('http://localhost:3000/auth/github/callback'),
    /**
     * Piston API
     */
    PISTON_API_URL: z.string().url("Needs to be a valid url").default('https://emkc.org/api/v2/piston'),
})

export type EnvVariables = z.infer<typeof envVariables>

export default envVariables.parse(process.env)