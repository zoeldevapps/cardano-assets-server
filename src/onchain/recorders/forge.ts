import _ from "lodash";
import { sql } from "slonik";
import { forge } from "../../db/schema";
import { createOrFindAssets } from "../../db/utils";
import { logger } from "../../logger";
import { Recorder, SupportedTx } from "./utils";

export const recordForge: Recorder = async (block, { db }) => {
  const transactions: SupportedTx[] = block.body;

  /**
   * Find all minted FTs and NFTs that fit the standard.
   * Reference tokens are processed later from the outputs together with the metadata
   */
  const forgedAssets = _.chain(transactions)
    .map((tx, index) =>
      _.entries(tx.body.mint.assets || {}).map<{
        txIndex: number;
        policyId: string;
        assetName: string;
        subject: string;
        quantity: bigint;
      }>(([unit, quantity]) => {
        const [policyId, assetName = ""] = unit.split(".");
        return {
          txIndex: index,
          policyId,
          assetName,
          subject: `${policyId}${assetName}`,
          quantity: BigInt(quantity),
        };
      })
    )
    .flatten()
    .value();

  if (forgedAssets.length === 0) {
    return;
  }

  const assetMap = await createOrFindAssets(
    db,
    forgedAssets.map((asset) => asset.subject),
    block.header.slot
  );

  // extend forge assets with supply
  // since inside one block tokens can be minted multiple times
  // simply selecting _before_ inserting will not have the updated data from this block
  // unless everything is serialized
  const supplyMap = Object.fromEntries(
    (
      await db.query(sql.type(forge.pick({ assetId: true, supply: true }))`
        SELECT DISTINCT ON(asset_id)
          asset_id, supply
        FROM forge
        WHERE asset_id = ANY(${sql.array(Object.values(assetMap), "int4")})
        ORDER BY asset_id, block_id DESC, tx_index DESC
        `)
    ).rows.map((asset) => [asset.assetId, asset.supply])
  );

  // while mutating supplyMap update the supply
  const forgedAssetsWithSupply = forgedAssets.map((asset) => {
    const assetId = assetMap[asset.subject];
    const newSupply = (supplyMap[assetId] || 0n) + asset.quantity;
    supplyMap[assetId] = newSupply;
    return [assetId, block.header.slot, asset.txIndex, asset.quantity.toString(), newSupply.toString()];
  });

  const res = await db.query(sql`
  INSERT INTO forge (asset_id, block_id, tx_index, qty, supply)
  SELECT
    T.asset_id, T.block_id, T.tx_index, T.qty,
    T.supplyStr::NUMERIC(78) as supply
  FROM ${sql.unnest(forgedAssetsWithSupply, ["int4", "int8", "int4", "int8", "text"])}
    AS T(asset_id, block_id, tx_index, qty, supplyStr)
  RETURNING id
  `);

  logger.debug({ count: forgedAssets.length, inserted: res.rowCount }, "Stored forged assets.");
};
