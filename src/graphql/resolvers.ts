import { bech32 } from "bech32";
import { keyBy } from "lodash";
import { IResolvers, MercuriusLoaders } from "mercurius";
import { Op } from "sequelize";

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
          bech32.toWords(Buffer.from(asset.subject, "hex"))
        ),
      };
    },
  },
};

export const loaders: MercuriusLoaders = {
  Asset: {
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
      const offchainMetadata = await ctx.db.OffchainMetadata.findAll({
        where: {
          subject: {
            [Op.in]: queries.map(({ obj: asset }) => asset.id),
          },
        },
      });
      const offchainMetadataBySubject = keyBy(offchainMetadata, "subject");

      return queries.map(({ obj: asset }) => {
        const offchain = offchainMetadataBySubject[asset.id];
        return {
          name: offchain?.name || Buffer.from(asset.assetName, "hex").toString("utf-8"),
          decimals: offchain?.decimals || 0,
          description: offchain?.description || null,
          image: offchain?.logo || null, // TODO add the png headers? to offchain?
        };
      });
    },
  },
};
