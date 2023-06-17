import { Signales } from "@dynamicabot/signales";
import env from "./env";

const logger = new Signales({
  config: {
    displayTimestamp: true,
    displayBadge: true,
    displayLabel: true,
  },
  secrets: Object.entries(env)
    .filter(([key]) => key.includes("SECRET"))
    .map(([key, value]) => value),
});

export default logger;
