import { bech32 } from "bech32";
import { keyBy } from "lodash";
import { IResolvers, MercuriusLoaders } from "mercurius";
import { Op } from "sequelize";
import { Asset, CIP25Metadata, OffchainMetadata } from "../db";

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
      const metadataBySubject = keyBy(metadata, "subject");
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
      const metadataBySubject = keyBy(metadata, "subject");
      return queries.map(({ obj: asset }) => metadataBySubject[asset.id] || null);
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

      const assetsBySubject = keyBy(assets, "subject");

      return queries.map(({ obj: asset }) => {
        const assetWithMetadata = assetsBySubject[asset.id];
        const offchain = assetWithMetadata.OffchainMetadatum;
        const cip25 = assetWithMetadata.CIP25Metadatum;
        return {
          name: offchain?.name || cip25?.name || Buffer.from(asset.assetName, "hex").toString("utf-8"),
          decimals: offchain?.decimals || 0,
          description: offchain?.description || cip25?.description || null,
          image:
            (offchain?.logo ? `data:image/png;base64,${offchain.logo}` : undefined) || cip25?.image || null,
        };
      });
    },
  },
};
