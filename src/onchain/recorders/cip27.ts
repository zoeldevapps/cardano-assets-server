import _ from "lodash";
import { CIP27Royalty } from "../../db/models";
import { logger } from "../../logger";
import { joinStringIfNeeded, parseMetadatumLossy, Recorder, SupportedTx } from "./utils";

const CIP_27_METADATUM_LABEL = "777";

export const recordCIP27: Recorder = async (block, dbBlock) => {
  const transactions: SupportedTx[] = block.body;

  const cip27Transactions = transactions.filter(
    (tx) => !!tx.body.mint.assets && _.has(tx.metadata?.body.blob, CIP_27_METADATUM_LABEL)
  );

  if (cip27Transactions.length === 0) {
    return;
  }

  const policyIdsWithRoyalties = _.compact(
    cip27Transactions.map((tx) => {
      const royaltyTokens = _.entries(tx.body.mint.assets)
        .filter(([unit, qty]) => BigInt(qty) === 1n && !unit.split(".")[1] /* there is no asset name */)
        .map(([unit]) => unit.split(".")[0]);

      const royaltyMetadatum = tx.metadata?.body.blob?.[CIP_27_METADATUM_LABEL];

      // in a single tx there can be at most 1 royalty token
      if (royaltyTokens.length !== 1 || !royaltyMetadatum) {
        logger.warn({ royaltyMetadatum, royaltyTokens }, "Invalid CIP27 transaction");
        return null;
      }

      const policyId = royaltyTokens[0];

      const metadata = parseMetadatumLossy(royaltyMetadatum);

      if (!_.isObject(metadata)) {
        logger.warn({ royaltyMetadatum }, "Invalid CIP27 metadata");
        return null;
      }

      const rate = metadata["rate"] || metadata["pct"];
      const addr = joinStringIfNeeded(metadata["addr"] || metadata["address"]);

      if (_.isString(rate) && _.isString(addr)) {
        return {
          policyId,
          rate,
          addr,
        };
      } else {
        logger.warn({ addr, rate }, "CIP27 metadata is missing required fields");
        return null;
      }
    })
  );

  if (policyIdsWithRoyalties.length === 0) {
    return;
  }

  await CIP27Royalty.bulkCreate(
    policyIdsWithRoyalties.map(({ policyId, rate, addr }) => ({
      policyId,
      rate,
      addr,
      BlockId: dbBlock.id,
    })),
    {
      ignoreDuplicates: true,
    }
  );
  logger.debug({ royaltyCount: policyIdsWithRoyalties }, "Inserted royalties for policies");
};
