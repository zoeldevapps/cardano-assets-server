import { createChainSyncClient, ChainSync, Schema } from "@cardano-ogmios/client";
import _ from "lodash";
import { DatabasePool, sql } from "slonik";
import { logger } from "../logger";
import { createContext } from "./interactionContext";
import { getSupportedBlock, Recorder, Rollback } from "./recorders/utils";

class MetadataSync implements ChainSync.ChainSyncMessageHandlers {
  throttledLog: _.DebouncedFunc<(obj: unknown, msg: string, ...args: unknown[]) => void>;

  constructor(public db: DatabasePool, public recorders: Recorder[], public rollbacks: Rollback[]) {
    this.throttledLog = _.throttle(logger.info.bind(logger), 5000);
  }

  async rollBackward(
    response: { point: Schema.PointOrOrigin; tip: Schema.TipOrOrigin },
    requestNext: () => void
  ) {
    if (response.point === "origin") {
      await this.db.any(sql`DELETE FORM block`);
    } else {
      await this.db.any(sql`DELETE FROM block WHERE slot > ${response.point.slot}`);
    }
    if (this.rollbacks.length > 0) {
      try {
        await Promise.all(this.rollbacks.map((rollback) => rollback(response.point, { db: this.db })));
        logger.info({ point: response.point, tip: response.tip }, "Rolled back");
      } catch (err) {
        logger.error({ err, point: response.point }, "Unable to roll back to point");
        // rethrow to shut down sync
        throw err;
      }
    }
    requestNext();
  }

  async rollForward(response: { block: Schema.Block; tip: Schema.TipOrOrigin }, requestNext: () => void) {
    const block = getSupportedBlock(response.block);
    if (!block) {
      requestNext();
      return;
    }

    await this.db.connect(async (conn) => {
      await conn.any(
        sql`INSERT INTO block (slot, hash) VALUES (${block.header.slot}, ${sql.binary(
          Buffer.from(block.headerHash, "hex")
        )})`
      );

      try {
        await Promise.all(this.recorders.map((recorder) => recorder(block, { db: conn })));
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
    });
  }
}

export async function startChainSync({
  db,
  points,
  recorders,
  rollbacks,
  onClose,
}: {
  db: DatabasePool;
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
  client = await createChainSyncClient(context, new MetadataSync(db, recorders, rollbacks));

  await client.startSync(points);
  return client;
}
