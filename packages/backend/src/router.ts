import authRouter from "./routers/authRouter";
import competitionsRouter from "./routers/competitionsRouter";
import pistonRouter from "./routers/pistonRouter";
import questionsRouter from "./routers/questionsRouter";
import teamsRouter from "./routers/teamsRouter";
import { t } from "./trpc";

const appRouter = t.router({
    piston: pistonRouter,
    competitions: competitionsRouter,
    teams: teamsRouter,
    questions: questionsRouter,
    auth: authRouter,
});

export default appRouter;

export type AppRouter = typeof appRouter;