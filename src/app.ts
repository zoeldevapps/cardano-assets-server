import delay from "delay";
import { sequelize } from "./db";
import { logger } from "./logger";
import { RATE_LIMIT_INTERVAL_IN_MS, syncOffchainMetadata } from "./offchain";
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

(async () => {
  try {
    await sequelize.sync();
    await startServer();
    syncOffchainMetadataLoop();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
