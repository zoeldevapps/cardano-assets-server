import { Schema } from "@cardano-ogmios/client";
import { ChainSyncClient } from "@cardano-ogmios/client/dist/ChainSync";
import delay from "delay";
import { sql } from "slonik";
import { options } from "../config";
import { initDb } from "../db/pool";
import { block } from "../db/schema";
import { logger } from "../logger";
import { startChainSync } from "./chainSync";
import { recordCIP25 } from "./recorders/cip25";
import { recordCIP27 } from "./recorders/cip27";
import { recordCIP68 } from "./recorders/cip68";
import { recordForge } from "./recorders/forge";

const REQUIRED_CONFIRMATION_HEIGHT = 20;

let chainSyncClient: ChainSyncClient | null = null;

export async function recordOnchainMetadata() {
  const db = await initDb();

  const syncFromBlock = await db.maybeOne(sql.type(block)`
    SELECT * FROM block
    ORDER BY slot DESC
    OFFSET ${REQUIRED_CONFIRMATION_HEIGHT} LIMIT 1
  `);

  let startPoint: Schema.PointOrOrigin = options.onchain.syncFrom;
  if (syncFromBlock) {
    startPoint = {
      slot: Number(syncFromBlock.slot),
      hash: syncFromBlock.hash.toString("hex"),
    };
  }

  logger.info({ startPoint }, "Starting sync with ogmios");

  chainSyncClient = await startChainSync({
    db,
    points: [startPoint, options.onchain.syncFrom],
    recorders: [recordForge, recordCIP25, recordCIP68, recordCIP27],
    rollbacks: [],
    onClose: async () => {
      logger.error("Onchain recording stopped unexpectedly");
      await delay(5000);
      process.exit(1);
    },
  });

  return chainSyncClient;
}

export async function stopRecord() {
  if (chainSyncClient) {
    await chainSyncClient.shutdown();
  }
}
