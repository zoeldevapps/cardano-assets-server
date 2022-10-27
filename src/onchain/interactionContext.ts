import { createInteractionContext } from "@cardano-ogmios/client";
import { options } from "../config";
import { logger } from "../logger";

export function createContext(onError?: (err: Error) => void, onClose?: () => void) {
  return createInteractionContext(
    (err) => {
      logger.error(err, "Ogmios connection error");
      onError?.(err);
    },
    () => {
      logger.info("Ogmios connection closed.");
      onClose?.();
    },
    { connection: { port: options.ogmios.port, host: options.ogmios.host } }
  );
}
