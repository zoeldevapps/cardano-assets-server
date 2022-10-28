import delay from "delay";
import { options } from "./config";
import { sequelize } from "./db/models";
import { logger } from "./logger";
import { RATE_LIMIT_INTERVAL_IN_MS, syncOffchainMetadata } from "./offchain";
import { recordOnchainMetadata, stopRecord } from "./onchain/record";
import { startServer } from "./server";

async function syncOffchainMetadataLoop() {
  while (true) {
    try {
      await syncOffchainMetadata();
    } catch (err) {
      logger.error({ err }, "Unable to sync offchain metadata");
    }
    await delay(RATE_LIMIT_INTERVAL_IN_MS);
  }
}

function setupCleanup() {
  function onExit({ caller, exit }: { caller?: string; exit?: boolean }) {
    return async () => {
      logger.warn(`Exiting due to ${caller}`);
      logger.flush();
      await stopRecord();
      await sequelize.close();
      await delay(2000);
      if (exit) {
        process.exit();
      }
    };
  }
  // do something when app is closing
  process.on("exit", onExit({ caller: "exit" }));

  // catches ctrl+c event
  process.on("SIGINT", onExit({ caller: "SIGINT", exit: true }));

  // catches "kill pid" (for example: nodemon restart)
  process.on("SIGUSR1", onExit({ exit: true }));
  process.on("SIGUSR2", onExit({ caller: "SIGUSR2", exit: true }));
}

(async () => {
  setupCleanup();
  try {
    // TODO replace with migrations after v1
    await sequelize.sync();
    await startServer();
    if (!options.isDevelopment) {
      // in development mode sync offchain metadata using the scripts
      syncOffchainMetadataLoop();
    }
    await recordOnchainMetadata();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
