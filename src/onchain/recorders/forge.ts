import _ from "lodash";
import { Forge } from "../../db/models";
import { createOrFindAssets } from "../../db/utils";
import { logger } from "../../logger";
import { Recorder, SupportedTx } from "./utils";

export const recordForge: Recorder = async (block, dbBlock) => {
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
        const [policyId, assetName] = unit.split(".");
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

  const assetMap = await createOrFindAssets(forgedAssets.map(([asset]) => asset));

  await Forge.bulkCreate(
    forgedAssets.map(([asset, quantity]) => ({
      quantity,
      AssetId: assetMap[asset.subject],
      BlockId: dbBlock.id,
    }))
  );
  logger.debug({ count: forgedAssets.length }, "Stored forged assets.");
};
