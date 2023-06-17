import migrate from "./db/migrate";
import env from "./env";
import logger from "./logger";
import * as express from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import router from "./router";
import { createContext } from "./trpc";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { createClient } from "redis";
import RedisStore from "connect-redis";
import session from "express-session";
import passport from "passport";
import githubStrategy from "./strategies/GithubStrategy";
import db from "./db/db";

const bootstrapLogger = logger.scope("Bootstrap");

async function bootstrap() {
  await migrate(env.SECRET_DB_URL);

  const app = express.default();

  app.use(helmet());
  app.use(cookieParser(env.COOKIE_SECRET));

  const redisClient = createClient({
    url: env.REDIS_URL,
  });

  redisClient.on("error", function (error) {
    bootstrapLogger.error(error);
  });

  await redisClient.connect();
  bootstrapLogger.success("Connected to Redis");

  const redisStore = new RedisStore({
    client: redisClient,
  });

  app.use(
    session({
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: redisStore,
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(githubStrategy);

  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(async function (id: number, done) {
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id),
    });
    done(null, user);
  });

  app.get("/auth/github", passport.authenticate("github"));

  app.get(
    "/auth/github/callback",
    passport.authenticate("github", { failureRedirect: "/login" }),
    function (req, res) {
      // Successful authentication, redirect home.
      res.redirect("/");
    }
  );

  app.use(
    "/trpc",
    trpcExpress.createExpressMiddleware({ createContext, router })
  );

  app.listen(env.PORT, () => {
    bootstrapLogger.success(`Listening on port ${env.PORT}`);
  });
}
bootstrap();
