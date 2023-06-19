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
import pistonClient from "./libs/piston/client";
import discordStrategy from "./strategies/DiscordStrategy";
import googleStrategy from "./strategies/GoogleStrategy";

const bootstrapLogger = logger.scope("Bootstrap");

async function bootstrap() {
  await migrate(env.SECRET_DB_URL);

  const app = express.default();

  app.use(helmet());
  app.use(cookieParser(env.COOKIE_SECRET));

  const redisClient = createClient({
    url: env.REDIS_SESSION_URL,
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

  if (
    env.GITHUB_CALLBACK_URL &&
    env.GITHUB_CLIENT_ID &&
    env.GITHUB_CLIENT_SECRET
  ) {
    passport.use(
      githubStrategy(
        env.GITHUB_CLIENT_ID,
        env.GITHUB_CLIENT_SECRET,
        env.GITHUB_CALLBACK_URL
      )
    );

    app.get("/auth/github", passport.authenticate("github"));

    app.get(
      "/auth/github/callback",
      passport.authenticate("github", {
        failureRedirect: env.FRONTEND_URL + "/login",
        successRedirect: env.FRONTEND_URL,
      })
    );

    bootstrapLogger.success("Github auth enabled");
  }

  if (
    env.DISCORD_CALLBACK_URL &&
    env.DISCORD_CLIENT_ID &&
    env.DISCORD_CLIENT_SECRET
  ) {
    passport.use(
      discordStrategy(
        env.DISCORD_CLIENT_ID,
        env.DISCORD_CLIENT_SECRET,
        env.DISCORD_CALLBACK_URL
      )
    );

    app.get("/auth/discord", passport.authenticate("discord"));

    app.get(
      "/auth/discord/callback",
      passport.authenticate("discord", {
        failureRedirect: env.FRONTEND_URL + "/login",
        successRedirect: env.FRONTEND_URL,
      })
    );

    bootstrapLogger.success("Discord auth enabled");
  }

  if (
    env.GOOGLE_CALLBACK_URL &&
    env.GOOGLE_CLIENT_ID &&
    env.GOOGLE_CLIENT_SECRET
  ) {
    passport.use(
      googleStrategy(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_CALLBACK_URL
      )
    );

    app.get(
      "/auth/google",
      passport.authenticate("google", { scope: ["profile"] })
    );

    app.get(
      "/auth/google/callback",
      passport.authenticate("google", {
        failureRedirect: env.FRONTEND_URL + "/login",
        successRedirect: env.FRONTEND_URL,
      })
    );

    bootstrapLogger.success("Google auth enabled");
  }

  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(async function (id: string, done) {
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id),
    });
    done(null, user);
  });

  app.use(
    "/trpc",
    trpcExpress.createExpressMiddleware({ createContext, router })
  );

  // try {
  //   await pistonClient.installPackage({
  //     language: "python",
  //     version: "3.10.0",
  //   })
  // } catch (error) {
  //   console.log(error)
  // }

  // const execRes = await pistonClient.execute({
  //   language: "python",
  //   version: "3.10.0",
  //   files: [
  //     {
  //       content: "  print('Hello World')",
  //       name: "main.py",
  //     }
  //   ]
  // })

  // console.log(execRes)

  app.listen(env.PORT, () => {
    bootstrapLogger.success(`Listening on port ${env.PORT}`);
  });
}
bootstrap();
