import { z } from "zod";

/**
 * Schemas for runtime query checks
 */

export const block = z.object({
  slot: z.bigint(),
  hash: z.instanceof(Buffer),
});

export const rawAsset = z.object({
  id: z.number(),
  subject: z.instanceof(Buffer),
  lastInteracted: z.bigint(),
});

export const asset = z.object({
  id: z.number(),
  rawSubject: z.instanceof(Buffer),
  subject: z.string(),
  policyId: z.string(),
  assetName: z.string(),
});

export const forge = z.object({
  id: z.number(),
  assetId: z.number(),
  blockId: z.bigint(),
  txIndex: z.number(),
  qty: z.bigint(),
  supply: z.bigint(),
});

export const offchain = z.object({
  assetId: z.number(),
  hash: z.string(),
  name: z.string(),
  description: z.string(),
  policy: z.instanceof(Buffer).nullable(),
  ticker: z.string().nullable(),
  url: z.string().nullable(),
  decimals: z.number().nullable(),
});

export const cip25Metadata = z.object({
  id: z.number(),
  assetId: z.number(),
  blockId: z.bigint(),
  name: z.string(),
  image: z.string(),
  description: z.string().nullable(),
  mediaType: z.string().nullable(),
  properties: z.record(z.string(), z.any()).nullable(),
});

export const cip27Royalty = z.object({
  id: z.number(),
  blockId: z.bigint(),
  policyId: z.instanceof(Buffer),
  rate: z.string(),
  addr: z.string(),
});

export const cip68Metadata = z.object({
  id: z.number(),
  assetId: z.number(),
  blockId: z.bigint(),
  name: z.string(),
  properties: z.record(z.string(), z.any()).nullable(),
});
