import { TRPCError, inferAsyncReturnType, initTRPC } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import db from "./db/db";
import SuperJSON from "superjson";



export const createContext = ({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) => ({
    user: req.user,
    db: db,
}); // no context

type Context = inferAsyncReturnType<typeof createContext>;

export const t = initTRPC.context<Context>().create({
  transformer: SuperJSON
});

const isAuthed = t.middleware((opts) => {
  const { ctx } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return opts.next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const isAdmin = t.middleware((opts) => {
  const { ctx } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  if (!ctx.user.roles.includes("Admin")) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return opts.next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const publicProcedure = t.procedure

export const authedProcedure = t.procedure.use(isAuthed)

export const adminProcedure = t.procedure.use(isAuthed).use(isAdmin)
