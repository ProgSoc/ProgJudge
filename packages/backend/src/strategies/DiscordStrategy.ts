import { Strategy } from "passport-discord";
import handleProvider from "./handleProvider";

const discordStrategy = (
  clientID: string,
  clientSecret: string,
  callbackURL: string
) =>
  new Strategy(
    {
      clientID,
      clientSecret,
      callbackURL,
      passReqToCallback: true,
      scope: ["identify"],
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const user = await handleProvider(
          "Discord",
          accessToken,
          refreshToken,
          profile.id,
          profile.username,
          req.user?.id
        );

        done(null, user);
      } catch (error) {
        done(error as Error);
      }
    }
  );

export default discordStrategy;
