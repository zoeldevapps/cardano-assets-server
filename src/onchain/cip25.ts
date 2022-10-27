import _ from "lodash";
import { CIP25Metadata } from "../db";
import { createOrFindAssets } from "../db/utils";
import { logger } from "../logger";
import { parseMetadatumLossy, safeJSONStringify, Recorder, SupportedTx } from "./utils";

const CIP_25_METADATUM_LABEL = "721";
const POLICY_ID_LENGTH_BASE16 = 56;

declare module "lodash" {
  interface LoDashStatic {
    isObject(value?: unknown): value is Record<string, unknown>;
  }
}

function parseOptionalString(data: unknown): string | undefined {
  return _.isString(data) ? data : undefined;
}

function parseTokenMetadata(data: unknown) {
  if (!_.isObject(data) || !_.isString(data["name"])) {
    return null;
  }

  return {
    name: data["name"],
    /* some nfts don't follow the standard and set the url instead */
    image: _.isString(data["image"]) ? data["image"] : _.isString(data["url"]) ? data["url"] : "",
    description: parseOptionalString(data["description"]),
    mediaType: parseOptionalString(data["mediaType"]),
    otherProperties: _.omit(data, "name", "image", "description", "mediaType"),
  };
}

function parseCIP25Assets(tx: SupportedTx) {
  const mintedAssets = tx.body.mint.assets;
  const rawMetadatum = tx.metadata?.body.blob?.[CIP_25_METADATUM_LABEL];
  if (!rawMetadatum || !mintedAssets) {
    logger.debug({ rawMetadatum, mintedAssets }, "Sanity check failed for a CIP25 tx");
    return [];
  }

  const metadata = parseMetadatumLossy(rawMetadatum);
  if (!_.isObject(metadata)) {
    logger.debug({ metadata }, "Unexpected CIP25 metadata");
    return [];
  }

  // in version 2 the assetNames are hex-encoded
  const isV2 = metadata["version"] === 2n;

  const txAssetsWithMetadata = _.entries(metadata)
    .map(([policyId, assetNames]) => {
      if (policyId === "version" || policyId.length !== POLICY_ID_LENGTH_BASE16 || !_.isObject(assetNames)) {
        return null;
      }
      return _.entries(assetNames).map(([rawAssetName, data]) => {
        const assetName = isV2 ? rawAssetName : Buffer.from(rawAssetName).toString("hex");
        const unit = `${policyId}.${assetName}`;

        // check if the token was minted (not burned or not available)
        if (BigInt(mintedAssets[unit] ?? 0) <= 0n) {
          logger.debug({ unit, mintedAssets, token: mintedAssets[unit] }, "Token was not minted");
          return null;
        }

        const parsedTokenData = parseTokenMetadata(data);

        if (!parsedTokenData) {
          logger.warn({ data, unit }, "Unable to parse CIP25 data");
          return null;
        }

        return {
          unit,
          subject: `${policyId}${assetName}`,
          policyId,
          assetName,
          data: parsedTokenData,
        };
      });
    })
    .flat();

  return _.compact(txAssetsWithMetadata);
}

export const recordCIP25: Recorder = async (block, dbBlock) => {
  const transactions: SupportedTx[] = block.body;

  const cip25Transactions = transactions.filter(
    (tx) => !!tx.body.mint.assets && _.has(tx.metadata?.body.blob, CIP_25_METADATUM_LABEL)
  );

  if (cip25Transactions.length > 0) {
    logger.debug(
      { count: cip25Transactions.length, hashes: cip25Transactions.map((tx) => tx.id) },
      "Found transactions with CIP 25 metadata"
    );
  }

  const assets = cip25Transactions.map(parseCIP25Assets).flat();

  if (assets.length === 0) {
    if (cip25Transactions.length > 0) {
      logger.debug("No proper CIP25 assets founds");
    }
    return;
  }

  logger.debug({ nftCount: assets.length }, "Found NFTs");

  const assetMapping = await createOrFindAssets(assets);

  await CIP25Metadata.bulkCreate(
    assets.map((asset) => ({
      name: asset.data.name,
      image: asset.data.image,
      subject: asset.subject,
      description: asset.data.description,
      mediaType: asset.data.description,
      otherProperties: safeJSONStringify(asset.data.otherProperties),
      AssetId: assetMapping[asset.subject],
      BlockId: dbBlock.id,
    })),
    {
      updateOnDuplicate: ["subject"],
    }
  );
  logger.info({ nftCount: assets.length }, "Parsed and inserted CIP25 metadata");
};
