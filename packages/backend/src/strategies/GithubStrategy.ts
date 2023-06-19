import { Strategy } from "passport-github2";
import type * as oauth2 from "passport-oauth2";
import handleProvider from "./handleProvider";

type VerifyFunctionParams = Parameters<oauth2.VerifyFunctionWithRequest>;

const verify: oauth2.VerifyFunctionWithRequest = async function verify(
  req: VerifyFunctionParams["0"],
  accessToken: VerifyFunctionParams["1"],
  refreshToken: VerifyFunctionParams["2"],
  profile: VerifyFunctionParams["3"],
  done: VerifyFunctionParams["4"]
) {
  try {
    const user = await handleProvider(
      "Github",
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
};

const githubStrategy = (clientID: string, clientSecret: string, callbackURL: string) => new Strategy(
  {
    callbackURL,
    clientID,
    clientSecret,
    passReqToCallback: true,
  },
  verify
);

export default githubStrategy;