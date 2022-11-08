import delay from "delay";
import { DatabasePool } from "slonik";
import { initDb } from "../db/pool";
import { logger } from "../logger";
import { RATE_LIMIT_INTERVAL_IN_MS, syncOffchainMetadata } from "./offchain";

const offchainLoopDb: DatabasePool | null = null;

export async function syncOffchainMetadataLoop() {
  const offchainLoopDb = await initDb();
  while (!offchainLoopDb.getPoolState().ended) {
    try {
      await syncOffchainMetadata(offchainLoopDb);
    } catch (err) {
      logger.error({ err }, "Unable to sync offchain metadata");
    }
    await delay(RATE_LIMIT_INTERVAL_IN_MS);
  }
}

export async function stopOffchainMetadataLoop() {
  offchainLoopDb?.end();
}
