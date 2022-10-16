import pino from "pino";
import { options } from "./config";

export const logger: pino.Logger = pino({
  name: `assets-server`,
  level: options.logLevel,
});
