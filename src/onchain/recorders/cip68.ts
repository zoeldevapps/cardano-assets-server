/**
 * The current CIP68 is in DRAFT
 * https://cips.cardano.org/cips/cip68/
 *
 * There are several issues with the draft:
 *  - 1 token per UTxO - extremely wasteful for large series
 *  - NFTs sent to an unspendable address, will cause the minAda to be lost forever
 *  - the format still assumes generic metadata, which won't help smartcontracts
 *  - the standard does not specify if the metadata should be inlined or not
 *  - since the reference carries the metadata and the tokens can be minted separately
 *    the actual expected format is decided _afterwards_, when looking up. Which is annoying
 *    for an indexer
 *
 * Proposed additions:
 *  - extend metadata to include multiple tokens as a list or assetclass as key
 *  - require inlined metadata
 *    (ensures that it needs to be provided, but adds extra min ada fee)
 *  - NFT standard should not require locked ADA (metadata can be provided in redeemer/last spent)
 *  - Potentially make a fix set of fields (required and optional) with potential generic addition,
 *    so that the metadata can be easily used from smart contracts
 */

import { Schema } from "@cardano-ogmios/client";
import _ from "lodash";
import { CIP68Metadata } from "../../db/models";
import { createOrFindAssets } from "../../db/utils";
import { logger } from "../../logger";
import { ASSET_LABELS } from "../cip67Util";
import {
  ConstrData,
  decodeDatumSync,
  ObjectPlutusDatum,
  parseDatumLossy,
  PlutusSupportedTx,
  Recorder,
  safeJSONStringify,
} from "./utils";

const refRegexp = new RegExp(`.${ASSET_LABELS.REFERENCE}`);

const isRefToken = ([unit, amount]: [string, bigint | number]) =>
  BigInt(amount) === 1n && unit.match(refRegexp);

const extractRefTokensWithDatum = (tx: PlutusSupportedTx) => (txOut: Schema.TxOut) => {
  /* for now assuming that the datum might be attached to the witness */
  const datum = txOut.datum || (txOut.datumHash && tx.witness.datums[txOut.datumHash]);
  if (!_.isString(datum)) {
    return null;
  }
  const refTokens = _.entries(txOut.value.assets).filter(isRefToken);

  if (refTokens.length === 0) {
    return null;
  }

  logger.debug({ count: refTokens.length }, "Found CIP68 reference tokens");

  let metadata: ObjectPlutusDatum;
  try {
    const parsedDatum = decodeDatumSync(datum);
    // TODO do a better parsing of the data once final instead of lossy - e.g. zod
    if (
      parsedDatum instanceof ConstrData &&
      parsedDatum.constr === 0 &&
      parsedDatum.fields.length === 2 &&
      parsedDatum.fields[1] === 1 // version
    ) {
      // this is the expected format
      metadata = parseDatumLossy(parsedDatum.fields[0], { bufferEncoding: "utf8" });
      logger.debug({ metadata }, "Found metadata");
    } else {
      logger.debug("Unsupported CIP68 datum format");
      return null;
    }
  } catch (err) {
    logger.warn("Error parsing plutus data");
    return null;
  }

  return refTokens.map(([unit, _amount]) => {
    const [policyId, assetName] = unit.split(".");
    return {
      subject: `${policyId}${assetName}`,
      policyId,
      assetName,
      // for now assuming that the metadata has the format for a single token
      // in case there were multiple tokens, the metadata is copied between them
      metadata,
    };
  });
};

export const recordCIP68: Recorder = async (block, dbBlock) => {
  if (block.type === "Mary") {
    return;
  }
  const transactions: PlutusSupportedTx[] = block.body;

  /**
   * Find all minted FTs and NFTs that fit the standard.
   * Reference tokens are processed later from the outputs together with the metadata
   */
  const cip68AssetUnits = transactions
    .map((tx) =>
      _.keys(tx.body.mint.assets || {}).filter((unit) =>
        [ASSET_LABELS.FT, ASSET_LABELS.NFT].includes(unit.split(".")[1]?.slice(0, 8))
      )
    )
    .flat(2);

  if (cip68AssetUnits.length > 0) {
    await createOrFindAssets(
      cip68AssetUnits.map((unit) => {
        const [policyId, assetName] = unit.split(".");
        return {
          policyId,
          assetName,
          subject: `${policyId}${assetName}`,
        };
      })
    );
    logger.debug({ count: cip68AssetUnits.length }, "Adding CIP67 minted tokens");
  }

  /**
   * with CIP68 the reference tokens can be minted separately from
   * the actual FT/NFT that is referencing to it. When querying those
   * tokens the reference labels should be reconciled
   */
  const allReferenceTokenWithMetadata = transactions
    .map((tx) => {
      return _.compact(tx.body.outputs.map(extractRefTokensWithDatum(tx)).flat());
    })
    .flat();

  if (allReferenceTokenWithMetadata.length === 0) {
    return;
  }

  const assetMapping = await createOrFindAssets(allReferenceTokenWithMetadata);

  await CIP68Metadata.bulkCreate(
    allReferenceTokenWithMetadata.map(({ subject, metadata }) => ({
      subject,
      name: _.get(metadata, "name") || "",
      description: _.get(metadata, "description"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      otherProperties: safeJSONStringify(_.omit(metadata as any, "name", "description")),
      AssetId: assetMapping[subject],
      BlockId: dbBlock.id,
    }))
  );
  logger.debug({ count: allReferenceTokenWithMetadata.length }, "Adding or updating CIP68 onchain metadata");
};
