import { inferAsyncReturnType, initTRPC } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";

export const createContext = ({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) => ({
    user: req.user,
}); // no context

type Context = inferAsyncReturnType<typeof createContext>;

export const t = initTRPC.context<Context>().create();


