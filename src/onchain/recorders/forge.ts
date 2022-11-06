import _ from "lodash";
import { sql } from "slonik";
import { createOrFindAssets } from "../../db/utils";
import { logger } from "../../logger";
import { Recorder, SupportedTx } from "./utils";

export const recordForge: Recorder = async (block, { db }) => {
  const transactions: SupportedTx[] = block.body;

  /**
   * Find all minted FTs and NFTs that fit the standard.
   * Reference tokens are processed later from the outputs together with the metadata
   */
  const forgedAssets = transactions
    .map((tx) =>
      _.entries(tx.body.mint.assets || {}).map<
        [{ policyId: string; assetName: string; subject: string }, bigint]
      >(([unit, quantity]) => {
        const [policyId, assetName = ""] = unit.split(".");
        return [
          {
            policyId,
            assetName,
            subject: `${policyId}${assetName}`,
          },
          BigInt(quantity),
        ];
      })
    )
    .flat();

  if (forgedAssets.length === 0) {
    return;
  }

  const assetMap = await createOrFindAssets(
    db,
    forgedAssets.map(([asset]) => asset.subject),
    block.header.slot
  );

  const res = await db.query(sql`
  INSERT INTO forge (asset_id, block_id, qty)
  SELECT * FROM ${sql.unnest(
    forgedAssets.map(([asset, quantity]) => [
      assetMap[asset.subject],
      block.header.slot,
      quantity.toString(),
    ]),
    ["int4", "int8", "int8"]
  )}
  RETURNING id
  `);

  logger.debug({ count: forgedAssets.length, inserted: res.rowCount }, "Stored forged assets.");
};
