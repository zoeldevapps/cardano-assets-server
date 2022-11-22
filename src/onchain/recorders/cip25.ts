import { safeJSON } from "@cardano-ogmios/client";
import _ from "lodash";
import { sql } from "slonik";
import { createOrFindAssets } from "../../db/utils";
import { logger } from "../../logger";
import { CIP_25_METADATUM_LABEL, POLICY_ID_LENGTH_BASE16 } from "./constants";
import { parseMetadatumLossy, Recorder, SupportedTx, joinStringIfNeeded } from "./utils";

declare module "lodash" {
  interface LoDashStatic {
    isObject(value?: unknown): value is Record<string, unknown>;
  }
}

function parseOptionalString(data: unknown): string | undefined {
  return _.isString(data) ? data : undefined;
}

function parseTokenMetadata(data: unknown, assetName?: string) {
  if (!_.isObject(data)) {
    return null;
  }

  /* some nfts nfts don't follow the standard and skip the name */
  const name =
    joinStringIfNeeded(data["name"] || data["Name"]) || Buffer.from(assetName || "", "hex").toString("utf8");
  /* some nfts don't follow the standard and set the url instead */
  const image = joinStringIfNeeded(
    data["image"] ||
      data["url"] ||
      data["Image"] ||
      data["src"] ||
      data["ipfsUrl"] ||
      data["ipfs"] ||
      data["video"]
  );
  const description = joinStringIfNeeded(data["description"] || data["Description"]);

  // CIP-25 also requires the image to be required, but it's missing on some tokens
  if (!name) {
    logger.warn(data, "Unable to parse CIP-25 metadata, missing required fields");
    return null;
  }

  return {
    name,
    image,
    description: description || undefined,
    mediaType: parseOptionalString(data["mediaType"]),
    properties: _.omit(data, "name", "image", "url", "description", "mediaType"),
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

        const parsedTokenData = parseTokenMetadata(data, assetName);

        if (!parsedTokenData) {
          logger.warn({ data, unit }, "Unable to parse CIP25 data");
          return null;
        }

        return {
          subject: `${policyId}${assetName}`,
          data: parsedTokenData,
        };
      });
    })
    .flat();

  return _.compact(txAssetsWithMetadata);
}

export const recordCIP25: Recorder = async (block, { db }) => {
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

  const assetMapping = await createOrFindAssets(
    db,
    assets.map((asset) => asset.subject),
    block.header.slot
  );

  const res = await db.query(sql`
  INSERT INTO cip25_metadata (asset_id, block_id, name, image, description, media_type, properties)
  SELECT * FROM ${sql.unnest(
    assets.map((asset) => [
      assetMapping[asset.subject],
      block.header.slot,
      asset.data.name,
      asset.data.image || "", // field required by CIP-25, but missing on some tokens
      asset.data.description || null,
      asset.data.mediaType || null,
      safeJSON.stringify(asset.data.properties),
    ]),
    ["int4", "int8", "text", "text", "text", "text", "jsonb"]
  )}
  `);

  logger.debug(
    { nftCount: assets.length, insertedCoutn: res.rowCount },
    "Parsed and inserted CIP25 metadata"
  );
};
