import pistonRouter from "./routers/pistonRouter";
import { t } from "./trpc";

const appRouter = t.router({
    piston: pistonRouter
});

export default appRouter;

export type AppRouter = typeof appRouter;