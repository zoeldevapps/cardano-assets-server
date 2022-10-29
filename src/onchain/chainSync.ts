import { createChainSyncClient, ChainSync, Schema } from "@cardano-ogmios/client";
import _ from "lodash";
import { Op } from "sequelize";
import { Block as DbBlock } from "../db/models";
import { logger } from "../logger";
import { createContext } from "./interactionContext";
import { getSupportedBlock, Recorder, Rollback } from "./recorders/utils";

class MetadataSync implements ChainSync.ChainSyncMessageHandlers {
  throttledLog: _.DebouncedFunc<(obj: unknown, msg: string, ...args: unknown[]) => void>;

  constructor(public recorders: Recorder[], public rollbacks: Rollback[]) {
    this.throttledLog = _.throttle(logger.info.bind(logger), 5000);
  }
  async rollBackward(
    response: { point: Schema.PointOrOrigin; tip: Schema.TipOrOrigin },
    requestNext: () => void
  ) {
    await DbBlock.destroy(
      response.point === "origin"
        ? {}
        : {
            where: {
              slot: {
                [Op.gt]: response.point.slot,
              },
            },
          }
    );
    try {
      await Promise.all(this.rollbacks.map((rollback) => rollback(response.point)));
      logger.info({ point: response.point, tip: response.tip }, "Rolled back");
    } catch (err) {
      logger.error({ err, point: response.point }, "Unable to roll back to point");
      // rethrow to shut down sync
      throw err;
    }
    requestNext();
  }

  async rollForward(response: { block: Schema.Block; tip: Schema.TipOrOrigin }, requestNext: () => void) {
    const block = getSupportedBlock(response.block);
    if (!block) {
      requestNext();
      return;
    }

    const dbBlock = await DbBlock.create({
      slot: BigInt(block.header.slot),
      hash: block.headerHash,
    });

    try {
      await Promise.all(this.recorders.map((recorder) => recorder(block, dbBlock)));
      this.throttledLog(
        { slot: block.header.slot, height: block.header.blockHeight, tip: response.tip },
        "Rolled forward"
      );
    } catch (err) {
      logger.error(err, "Unable to roll forward block");
      // rethrow
      throw err;
    }
    requestNext();
  }
}

export async function startChainSync({
  points,
  recorders,
  rollbacks,
  onClose,
}: {
  points: Schema.PointOrOrigin[];
  recorders: Recorder[];
  rollbacks: Rollback[];
  onClose?: () => void;
}) {
  let client: ChainSync.ChainSyncClient | null = null;
  const context = await createContext(() => {
    client?.shutdown();
    onClose?.();
  }, onClose);
  client = await createChainSyncClient(context, new MetadataSync(recorders, rollbacks));

  await client.startSync(points);
  return client;
}
