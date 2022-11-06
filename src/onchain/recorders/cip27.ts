import _ from "lodash";
import { sql } from "slonik";
import { logger } from "../../logger";
import { joinStringIfNeeded, parseMetadatumLossy, Recorder, SupportedTx } from "./utils";

const CIP_27_METADATUM_LABEL = "777";

export const recordCIP27: Recorder = async (block, { db }) => {
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
        logger.warn(
          { royaltyMetadatum, assets: tx.body.mint.assets, txHash: tx.id },
          "Invalid CIP27 transaction"
        );
        return null;
      }

      const policyId = royaltyTokens[0];

      const metadata = parseMetadatumLossy(royaltyMetadatum);

      if (!_.isObject(metadata)) {
        logger.warn({ metadata }, "Invalid CIP27 metadata");
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

  const res = await db.query(sql`
  INSERT INTO cip27_royalty (block_id, policy_id, rate, addr)
  SELECT * FROM ${sql.unnest(
    policyIdsWithRoyalties.map(({ policyId, rate, addr }) => [
      block.header.slot,
      Buffer.from(policyId, "hex"),
      rate,
      addr,
    ]),
    ["int8", "bytea", "text", "text"]
  )}
  ON CONFLICT DO NOTHING
  RETURNING id
  `);

  logger.debug(
    { royaltyCount: policyIdsWithRoyalties, insertedCount: res.rowCount },
    "Inserted royalties for policies"
  );
};
