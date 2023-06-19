import { TRPCError, inferAsyncReturnType, initTRPC } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import db from "./db/db";
import SuperJSON from "superjson";
import { InferModel } from "drizzle-orm";
import { users } from "./db/schema";



export const createContext = ({
  req,
}: trpcExpress.CreateExpressContextOptions) => ({
    user: req.user as InferModel<typeof users, "select"> | undefined,
    db: db,
    logout: () => new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
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
