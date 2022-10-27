import axios from "axios";
import { Op } from "sequelize";
import { options } from "./config";
import { OffchainMetadata, OffchainMetadataAsset } from "./db";
import { createOrFindAssets } from "./db/utils";
import { logger } from "./logger";
import { githubRateLimit } from "./util";

export const {
  registry,
  repository,
  folder: subjectFolder,
} = options.network === "1" /* mainnet */
  ? {
      repository: "git@github.com:cardano-foundation/cardano-token-registry.git",
      registry: "https://api.github.com/repos/cardano-foundation/cardano-token-registry",
      folder: "mappings",
    }
  : {
      repository: "git@github.com:input-output-hk/metadata-registry-testnet.git",
      registry: "https://api.github.com/repos/input-output-hk/metadata-registry-testnet",
      folder: "registry",
    };

type VersionedField = {
  value: string;
  sequenceNumber: number;
  signatures: Array<{
    signature: string;
    publicKey: string;
  }>;
};

type TokenMetadata = {
  // subject is hex encoded policyId <> assetName
  subject: string;
  name: VersionedField;
  description: VersionedField;
  policy?: string /* if not a plutus script */;
  ticker?: VersionedField;
  url?: VersionedField;
  logo?: VersionedField;
  decimals?: VersionedField;
};

type TreeEntry = {
  path: string; // e.g. "007394e3117755fbb0558b93c54ce3bc6c85770920044ade143dc7424506f636b65744368616e6765.json",
  mode: string; // e.g. "100644",
  type: string; // e.g. "blob",
  sha: string; // e.g. "456e64d2edf80b22f1551663304e354731cb689b",
  size: number; // e.g. 1829,
  url: string; // url to blob
};

type Blob = {
  sha: string; // e.g. "cb74e06144c825417cfe8e46b5aa7c03b4c2dacb",
  node_id: string; // e.g. "MDQ6QmxvYjMzOTc4NTAzNzpjYjc0ZTA2MTQ0YzgyNTQxN2NmZThlNDZiNWFhN2MwM2I0YzJkYWNi",
  size: number; // e.g. 1020,
  url: string; // e.g. "https://api.github.com/repos/cardano-foundation/cardano-token-registry/git/blobs/cb74e06144c825417cfe8e46b5aa7c03b4c2dacb",
  content: string; // data
  encoding: BufferEncoding; // e.g. "base64"
};

/**
 * Github has very aggressive rate limits
 */
const RATE_LIMIT_MAX_REQUESTS = 60;
export const RATE_LIMIT_INTERVAL_IN_MS = 3_600_000; // 60 * 60 * 1000
const http = githubRateLimit(axios.create());

async function fetchLastCommitHash(): Promise<string> {
  const commits = (await http.get(`${registry}/commits`)).data;
  return commits[0].commit.tree.sha;
}

async function fetchSubjectFolderHash(commitHash: string): Promise<string> {
  const folder = (await http.get(`${registry}/git/trees/${commitHash}`)).data;
  const registryFolderTree = folder.tree.find((folder: TreeEntry) => folder.path === subjectFolder);
  return registryFolderTree.sha;
}

async function fetchSubjectsWithHash(registryTree: string): Promise<[string, string][]> {
  const registryFolder: { tree: TreeEntry[] } = (await http.get(`${registry}/git/trees/${registryTree}`))
    .data;
  return registryFolder.tree
    .filter(({ path }) => path.endsWith(".json"))
    .map(({ path, sha }) => [path.split(".")[0], sha]);
}

async function fetchMetadataContents(fileHash: string): Promise<TokenMetadata> {
  const blob: Blob = (await http.get(`${registry}/git/blobs/${fileHash}`)).data;
  const contents = Buffer.from(blob.content, blob.encoding).toString();
  // assuming json format => TODO add ajv parser
  const metadata: TokenMetadata = JSON.parse(contents);
  return metadata;
}

export async function syncOffchainMetadata(): Promise<void> {
  logger.debug("[Offchain] Fetching commits");
  const lastCommitHash = await fetchLastCommitHash();

  logger.debug({ lastCommitHash }, "[Offchain] Found commit, fetching folder hash");
  const registryFolderHash = await fetchSubjectFolderHash(lastCommitHash);

  logger.debug({ registryFolderHash }, "[Offchain] Found folder hash, fetching entries");
  const githubEntries = await fetchSubjectsWithHash(registryFolderHash);
  logger.debug({ count: githubEntries.length }, "Found subjects");

  const githubDataMap = Object.fromEntries(githubEntries);
  const dbData = (
    await OffchainMetadata.findAll({
      attributes: ["subject", "hash"],
    })
  ).map((data) => [data.subject, data.hash]);
  const dbDataMap = Object.fromEntries(dbData);

  const newEntries = githubEntries.filter(([subject]) => !dbDataMap[subject]);
  const changedEntries = githubEntries.filter(
    ([subject, hash]) => dbDataMap[subject] && dbDataMap[subject] !== hash
  );
  const removedEntries = dbData.filter(([subject]) => !githubDataMap[subject]);

  logger.debug(
    { newCount: newEntries.length, changedcount: changedEntries.length, removedCount: removedEntries.length },
    "[Offchain] Diff with the DB"
  );

  if (removedEntries.length > 0) {
    logger.debug("[Offchain] Destroying removed entries");
    await OffchainMetadata.destroy({
      where: {
        subject: {
          [Op.in]: removedEntries.map(([subject]) => subject),
        },
      },
    });
  }

  logger.debug("[Offchain] Fetching changed and new blobs");
  // fetch the blobs for the
  const blobs = await Promise.all(
    newEntries
      .concat(changedEntries)
      .slice(0, RATE_LIMIT_MAX_REQUESTS / 2) // ⚠️ Leave some rate limit
      .map(
        async ([_subject, hash]): Promise<TokenMetadata & { hash: string }> => ({
          hash,
          ...(await fetchMetadataContents(hash)),
        })
      )
  );
  return upsertMetadataWithHash(blobs);
}

export async function upsertMetadataWithHash(blobs: Array<TokenMetadata & { hash: string }>) {
  logger.debug("[Offchain] Creating assets just in case");
  const assetMapping = await createOrFindAssets(
    blobs.map(({ subject }) => ({
      subject,
      policyId: subject.substring(0, 56),
      assetName: subject.substring(56),
    }))
  );

  logger.debug("[Offchain] inserting metadata");
  await OffchainMetadata.bulkCreate(
    blobs.map((metadata) => ({
      hash: metadata.hash,
      subject: metadata.subject,
      name: metadata.name.value,
      description: metadata.description.value,
      policy: metadata.policy,
      ticker: metadata.ticker?.value,
      url: metadata.url?.value,
      logo: metadata.logo?.value,
      decimals: metadata.decimals && Number(metadata.decimals.value),
      AssetId: assetMapping[metadata.subject],
    })),
    {
      updateOnDuplicate: ["subject"],
      include: [
        {
          association: OffchainMetadataAsset,
          as: "asset",
        },
      ],
    }
  );
  logger.info({ count: blobs.length }, "[Offchain] updated offchain metadata entries");
}
