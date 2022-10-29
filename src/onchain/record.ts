import { Schema } from "@cardano-ogmios/client";
import { ChainSyncClient } from "@cardano-ogmios/client/dist/ChainSync";
import delay from "delay";
import { options } from "../config";
import { Block } from "../db/models";
import { logger } from "../logger";
import { startChainSync } from "./chainSync";
import { recordCIP25 } from "./recorders/cip25";
import { recordCIP68 } from "./recorders/cip68";
import { recordForge } from "./recorders/forge";

const REQUIRED_CONFIRMATION_HEIGHT = 20;

let chainSyncClient: ChainSyncClient | null = null;

export async function recordOnchainMetadata() {
  const syncFromBlock = await Block.findOne({
    order: [["slot", "DESC"]],
    offset: REQUIRED_CONFIRMATION_HEIGHT,
  });

  let startPoint: Schema.PointOrOrigin = options.onchain.syncFrom;
  if (syncFromBlock) {
    startPoint = {
      slot: Number(syncFromBlock.slot),
      hash: syncFromBlock.hash,
    };
  }

  chainSyncClient = await startChainSync({
    points: [startPoint, options.onchain.syncFrom],
    recorders: [recordCIP25, recordCIP68, recordForge],
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
