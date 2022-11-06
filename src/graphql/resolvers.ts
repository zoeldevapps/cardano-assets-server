import { safeJSON } from "@cardano-ogmios/client";
import { bech32 } from "bech32";
import _, { Dictionary } from "lodash";
import { IResolvers, MercuriusLoaders } from "mercurius";
import { sql } from "slonik";
import { z } from "zod";
import * as Schema from "../db/schema";
import {
  ASSET_LABELS,
  getReferenceSubject,
  getRefereneAssetName,
  isReferenceAssetName,
} from "../onchain/cip67Util";

export const resolvers: IResolvers = {
  Query: {
    async asset(_root, { subject }, ctx, _info) {
      const asset = await ctx.db.maybeOne(sql.type(Schema.asset)`
        SELECT *
        FROM asset WHERE raw_subject=${sql.binary(Buffer.from(subject, "hex"))} LIMIT 1
      `);

      if (!asset) {
        return null;
      }

      return {
        _dbId: asset.id,
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
      const { rows: metadata } = await ctx.db.query(sql.type(Schema.cip25Metadata)`
        SELECT
          id,
          asset_id,
          block_id,
          name,
          image,
          description,
          media_type,
          properties
        FROM cip25_metadata
        WHERE asset_id = ANY(${sql.array(
          queries.map(({ obj: asset }) => asset._dbId),
          "int4"
        )})
      `);

      const metadataBySubject = _.keyBy(metadata, "assetId");
      return queries.map(({ obj: asset }) => {
        const metadata = metadataBySubject[asset._dbId];
        if (!metadata) {
          return null;
        }
        return {
          ...metadata,
          properties: metadata.properties ? safeJSON.stringify(metadata.properties) : null,
        };
      });
    },
    async offchain(queries, ctx) {
      const { rows: metadata } = await ctx.db.query(sql.type(Schema.offchain)`
      SELECT *
      FROM offchain
      WHERE asset_id = ANY(${sql.array(
        queries.map(({ obj: asset }) => asset._dbId),
        "int4"
      )})
      `);
      const metadataBySubject = _.keyBy(metadata, "assetId");
      return queries.map(({ obj: asset }) => metadataBySubject[asset._dbId] || null);
    },
    async cip68ft(queries, ctx) {
      const cip68assets = queries.filter(({ obj: asset }) => asset.assetName.startsWith(ASSET_LABELS.FT));

      if (cip68assets.length === 0) {
        return queries.map(() => null);
      }

      const referenceMap = new Map(
        cip68assets.map(({ obj: asset }) => [
          asset._dbId,
          `${asset.policyId}${getRefereneAssetName(asset.assetName)}`,
        ])
      );

      const { rows: metadata } = await ctx.db.query(sql.type(
        Schema.cip68Metadata.omit({ id: true }).merge(Schema.asset.pick({ subject: true }))
      )`
        SELECT DISTINCT ON (asset_id)
          subject,
          asset_id,
          block_id,
          name,
          properties
        FROM cip68_metadata
        JOIN asset ON asset.id = asset_id
        WHERE asset.raw_subject = ANY(${sql.array(
          _.compact(
            cip68assets.map(({ obj: asset }) => {
              const referencedSubject = referenceMap.get(asset._dbId);
              return referencedSubject && Buffer.from(referencedSubject, "hex");
            })
          ),
          "bytea"
        )})
        ORDER BY asset_id, block_id DESC
      `);

      const metadataBySubject = _.keyBy(metadata, "subject");
      return queries.map(({ obj: asset }) => {
        const referenceSubject = referenceMap.get(asset._dbId);
        if (!referenceSubject) {
          return null;
        }
        const metadata = metadataBySubject[referenceSubject];
        if (!metadata) {
          return null;
        }
        const extraMetadata = metadata.properties || {};
        return {
          name: metadata.name,
          description: extraMetadata.description || "",
          policy: null,
          ticker: extraMetadata.ticker || null,
          url: extraMetadata.url || null,
          logo: extraMetadata.logo || null,
          decimals: extraMetadata.decimals || null,
          properties: safeJSON.stringify(extraMetadata) || null,
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
          asset._dbId,
          `${asset.policyId}${getRefereneAssetName(asset.assetName)}`,
        ])
      );

      const { rows: metadata } = await ctx.db.query(sql.type(
        Schema.cip68Metadata.omit({ id: true }).merge(Schema.asset.pick({ subject: true }))
      )`
        SELECT DISTINCT ON (asset_id)
          subject,
          asset_id,
          block_id,
          name,
          properties
        FROM cip68_metadata
        JOIN asset ON asset.id = asset_id
        WHERE asset.raw_subject = ANY(${sql.array(
          _.compact(
            cip68assets.map(({ obj: asset }) => {
              const referencedSubject = referenceMap.get(asset._dbId);
              return referencedSubject && Buffer.from(referencedSubject, "hex");
            })
          ),
          "bytea"
        )})
        ORDER BY asset_id, block_id DESC
      `);

      const metadataBySubject = _.keyBy(metadata, "subject");
      return queries.map(({ obj: asset }) => {
        const referenceSubject = referenceMap.get(asset._dbId);
        if (!referenceSubject) {
          return null;
        }
        const metadata = metadataBySubject[referenceSubject];
        if (!metadata) {
          return null;
        }
        const extraMetadata = metadata.properties;
        return {
          name: metadata.name,
          image: extraMetadata?.image || "",
          mediaType: extraMetadata?.mediaType || null,
          description: extraMetadata?.description || null,
          properties: safeJSON.stringify(extraMetadata) || null,
        };
      });
    },
    async common(queries, ctx) {
      const { rows: assets } = await ctx.db.query(sql.type(
        Schema.asset.pick({ id: true }).merge(
          z.object({
            "offchain.name": z.string().nullable(),
            "offchain.description": z.string().nullable(),
            "offchain.logo": z.string().nullable(),
            "offchain.decimals": z.number().nullable(),
            "cip25.name": z.string().nullable(),
            "cip25.description": z.string().nullable(),
            "cip25.image": z.string().nullable(),
          })
        )
      )`
      SELECT
        asset.id as "id",
        offchain.name AS "offchain.name",
        offchain.description AS "offchain.description",
        offchain.logo as "offchain.logo",
        offchain.decimals as "offchain.decimals",
        cip25.name as "cip25.name",
        cip25.description as "cip25.description",
        cip25.image as "cip25.image"
      FROM asset
      LEFT JOIN offchain ON asset.id = offchain.asset_id
      LEFT JOIN cip25_metadata AS cip25 ON asset.id = cip25.asset_id
      WHERE asset.id = ANY(${sql.array(
        queries.map(({ obj: asset }) => asset._dbId),
        "int4"
      )})
      `);

      const assetsById = _.keyBy(assets, "id");

      const referenceMap = new Map(
        _.compact(
          queries.map(({ obj: asset }) => {
            const referencedSubject = getReferenceSubject(asset);
            return referencedSubject ? [asset._dbId, referencedSubject] : null;
          })
        )
      );
      const cip68RefType = Schema.asset
        .pick({ subject: true })
        .merge(Schema.cip68Metadata.pick({ name: true, properties: true }));
      let assetReferenceBySubject: Dictionary<z.infer<typeof cip68RefType>> = {};
      if (referenceMap.size > 0) {
        const { rows: assetReferences } = await ctx.db.query(sql.type(cip68RefType)`
          SELECT DISTINCT ON (asset_id)
            subject,
            name,
            properties
          FROM cip68_metadata
          JOIN asset ON cip68_metadata.asset_id = asset.id
          WHERE raw_subject = ANY(${sql.array(
            Array.from(referenceMap.values()).map((ref) => Buffer.from(ref, "hex")),
            "bytea"
          )})
          ORDER BY asset_id, block_id DESC
        `);
        assetReferenceBySubject = _.keyBy(assetReferences, "subject");
      }

      return queries.map(({ obj: asset }) => {
        const metadata = assetsById[asset._dbId];

        const assetReference = referenceMap.get(asset._dbId);
        const cip68 = assetReference ? assetReferenceBySubject[assetReference] : null;
        const cip68extra = cip68?.properties;

        const namePrefix = isReferenceAssetName(asset) ? "[Reference] " : "";
        const logo = metadata["offchain.logo"] || cip68extra?.logo;
        return {
          name: `${namePrefix}${
            metadata["offchain.name"] ||
            metadata["cip25.name"] ||
            cip68?.name ||
            Buffer.from(asset.assetName, "hex").toString("utf-8")
          }`,
          decimals: metadata["offchain.decimals"] || cip68extra?.decimals || 0,
          description:
            metadata["offchain.description"] ||
            metadata["cip25.description"] ||
            cip68extra?.description ||
            null,
          image:
            (logo ? `data:image/png;base64,${logo}` : undefined) ||
            metadata["cip25.image"] ||
            cip68extra?.image ||
            null,
        };
      });
    },
    async supply(queries, ctx) {
      const { rows: forged } = await ctx.db.query(sql.type(
        z.object({ assetId: z.number(), supply: z.bigint() })
      )`
        SELECT asset_id, sum(qty)::bigint as "supply"
        FROM forge
        WHERE asset_id = ANY(${sql.array(
          queries.map(({ obj: asset }) => asset._dbId),
          "int4"
        )})
        GROUP BY asset_id
      `);

      const forgedByAsset = _.keyBy(forged, "assetId");
      return queries.map(({ obj: asset }) => BigInt(forgedByAsset[asset._dbId]?.supply || 0).toString());
    },
    async royalty(queries, ctx) {
      const royalties = _.keyBy(
        (
          await ctx.db.query(sql.type(Schema.cip27Royalty.pick({ policyId: true, rate: true, addr: true }))`
        SELECT
          policy_id,
          rate,
          addr
        FROM cip27_royalty
        WHERE policy_id = ANY(${sql.array(
          queries.map(({ obj: asset }) => Buffer.from(asset.policyId, "hex")),
          "bytea"
        )})
      `)
        ).rows,
        (row) => row.policyId.toString("hex")
      );

      return queries.map(({ obj: asset }) => royalties[asset.policyId] || null);
    },
  },
};
