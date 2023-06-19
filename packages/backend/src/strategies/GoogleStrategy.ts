import { Strategy } from "passport-google-oauth20";
import handleProvider from "./handleProvider";

const googleStrategy = (
    clientID: string,
    clientSecret: string,
    callbackURL: string
  ) =>
    new Strategy({
        clientID,
        clientSecret,
        callbackURL,
        passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
        try {
            const user = await handleProvider(
                "Google",
                accessToken,
                refreshToken,
                profile.id,
                profile.displayName,
                req.user?.id
            );

            done(null, user);
        } catch (error) {
            done(error as Error);
        }
    }
);

export default googleStrategy;