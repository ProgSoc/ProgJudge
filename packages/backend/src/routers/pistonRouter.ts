import pistonClient from "../libs/piston/client";
import { t } from "../trpc";

const pistonRouter = t.router({
    getPackages: t.procedure.query(({ctx}) => {
        console.log(ctx.user)
        return pistonClient.getPackages()
    })
})

export default pistonRouter;