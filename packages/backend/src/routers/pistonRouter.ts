import pistonClient from "../libs/piston/client";
import { t } from "../trpc";

const pistonRouter = t.router({
    getPackages: t.procedure.query(() => {
        return pistonClient.getPackages()
    })
})

export default pistonRouter;