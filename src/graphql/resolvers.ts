import { safeJSON } from "@cardano-ogmios/client";
import { bech32 } from "bech32";
import _, { Dictionary } from "lodash";
import { IResolvers, MercuriusLoaders } from "mercurius";
import { Op } from "sequelize";
import { Asset, CIP25Metadata, CIP68Metadata, OffchainMetadata } from "../db/models";
import {
  ASSET_LABELS,
  getReferenceSubject,
  getRefereneAssetName,
  isReferenceAssetName,
} from "../onchain/cip67Util";

export const resolvers: IResolvers = {
  Query: {
    async asset(_root, { subject }, ctx, _info) {
      const asset = await ctx.db.Asset.findOne({
        where: {
          subject: subject,
        },
      });

      if (!asset) {
        return null;
      }

      return {
        id: asset.subject,
        assetName: asset.assetName,
        policyId: asset.policyId,
        fingerprint: bech32.encode(
          ctx.network === "1" ? "asset" : "asset_test",
          bech32.toWords(Buffer.from(asset.subject, "hex")),
          256
        ),
      };
    },
  },
};

export const loaders: MercuriusLoaders = {
  Asset: {
    async cip25(queries, ctx) {
      const metadata = await ctx.db.CIP25Metadata.findAll({
        where: {
          subject: {
            [Op.in]: queries.map(({ obj: asset }) => asset.id),
          },
        },
      });
      const metadataBySubject = _.keyBy(metadata, "subject");
      return queries.map(({ obj: asset }) => metadataBySubject[asset.id] || null);
    },
    async offchain(queries, ctx) {
      const metadata = await ctx.db.OffchainMetadata.findAll({
        where: {
          subject: {
            [Op.in]: queries.map(({ obj: asset }) => asset.id),
          },
        },
      });
      const metadataBySubject = _.keyBy(metadata, "subject");
      return queries.map(({ obj: asset }) => metadataBySubject[asset.id] || null);
    },
    async cip68ft(queries, ctx) {
      const cip68assets = queries.filter(({ obj: asset }) => asset.assetName.startsWith(ASSET_LABELS.FT));

      if (cip68assets.length === 0) {
        return queries.map(() => null);
      }

      const referenceMap = new Map(
        cip68assets.map(({ obj: asset }) => [
          asset.id,
          `${asset.policyId}${getRefereneAssetName(asset.assetName)}`,
        ])
      );

      const metadata = await ctx.db.CIP68Metadata.findAll({
        where: {
          subject: {
            [Op.in]: _.compact(cip68assets.map(({ obj: asset }) => referenceMap.get(asset.id))),
          },
        },
      });

      const metadataBySubject = _.keyBy(metadata, "subject");
      return queries.map(({ obj: asset }) => {
        const referenceSubject = referenceMap.get(asset.id);
        if (!referenceSubject) {
          return null;
        }
        const metadata = metadataBySubject[referenceSubject];
        if (!metadata) {
          return null;
        }
        const extraMetadata = safeJSON.parse(metadata.otherProperties || "{}");
        return {
          subject: asset.id,
          name: metadata.name,
          description: metadata.description || "",
          policy: null,
          ticker: extraMetadata.ticker || null,
          url: extraMetadata.url || null,
          logo: extraMetadata.logo || null,
          decimals: extraMetadata.decimals || null,
        };
      });
    },
    async cip68nft(queries, ctx) {
      const cip68assets = queries.filter(({ obj: asset }) => asset.assetName.startsWith(ASSET_LABELS.NFT));

      if (cip68assets.length === 0) {
        return queries.map(() => null);
      }

      const referenceMap = new Map(
        cip68assets.map(({ obj: asset }) => [
          asset.id,
          `${asset.policyId}${getRefereneAssetName(asset.assetName)}`,
        ])
      );

      const metadata = await ctx.db.CIP68Metadata.findAll({
        where: {
          subject: {
            [Op.in]: _.compact(cip68assets.map(({ obj: asset }) => referenceMap.get(asset.id))),
          },
        },
      });
      const metadataBySubject = _.keyBy(metadata, "subject");
      return queries.map(({ obj: asset }) => {
        const referenceSubject = referenceMap.get(asset.id);
        if (!referenceSubject) {
          return null;
        }
        const metadata = metadataBySubject[referenceSubject];
        if (!metadata) {
          return null;
        }
        const extraMetadata = safeJSON.parse(metadata.otherProperties || "{}");
        return {
          name: metadata.name,
          image: extraMetadata.image || "",
          mediaType: extraMetadata.mediaType || null,
          description: metadata.description || null,
          otherProperties: metadata.otherProperties || null,
        };
      });
    },
    async common(queries, ctx) {
      const assets = (await ctx.db.Asset.findAll({
        where: {
          subject: {
            [Op.in]: queries.map(({ obj: asset }) => asset.id),
          },
        },
        include: [
          {
            model: ctx.db.OffchainMetadata,
            attributes: ["name", "description", "logo", "decimals"],
          },
          {
            model: ctx.db.CIP25Metadata,
            attributes: ["name", "description", "image"],
          },
        ],
      })) as (Asset & { OffchainMetadatum: null | OffchainMetadata; CIP25Metadatum: null | CIP25Metadata })[];

      const assetsBySubject = _.keyBy(assets, "subject");

      const referenceMap = new Map(
        _.compact(
          queries.map(({ obj: asset }) => {
            const referencedSubject = getReferenceSubject(asset);
            return referencedSubject ? [asset.id, referencedSubject] : null;
          })
        )
      );
      let assetReferenceBySubject: Dictionary<Asset & { CIP68Metadatum: null | CIP68Metadata }> = {};
      if (referenceMap.size > 0) {
        const assetReferences = (await ctx.db.Asset.findAll({
          where: {
            subject: {
              [Op.in]: Array.from(referenceMap.values()),
            },
          },
          include: [ctx.db.CIP68Metadata],
        })) as (Asset & { CIP68Metadatum: null | CIP68Metadata })[];
        assetReferenceBySubject = _.keyBy(assetReferences, "subject");
      }

      return queries.map(({ obj: asset }) => {
        const assetWithMetadata = assetsBySubject[asset.id];
        const offchain = assetWithMetadata.OffchainMetadatum;
        const cip25 = assetWithMetadata.CIP25Metadatum;

        const assetReference = referenceMap.get(asset.id);
        const cip68 = assetReference ? assetReferenceBySubject[assetReference].CIP68Metadatum : null;
        const cip68extra = cip68 ? safeJSON.parse(cip68.otherProperties || "{}") : null;

        const namePrefix = isReferenceAssetName(asset) ? "[Reference] " : "";
        const logo = offchain?.logo || cip68extra?.logo;
        return {
          name: `${namePrefix}${
            offchain?.name ||
            cip25?.name ||
            cip68?.name ||
            Buffer.from(asset.assetName, "hex").toString("utf-8")
          }`,
          decimals: offchain?.decimals || cip68extra?.decimals || 0,
          description: offchain?.description || cip25?.description || cip68?.description || null,
          image:
            (logo ? `data:image/png;base64,${logo}` : undefined) || cip25?.image || cip68extra?.image || null,
        };
      });
    },
  },
};
