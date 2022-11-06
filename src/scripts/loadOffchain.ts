import { spawnSync } from "child_process";
import { createCommand } from "commander";
import path from "path";
import fs from "fs";
import { repository, subjectFolder, upsertMetadataWithHash } from "../offchain";
import { logger } from "../logger";
import { initDb } from "../db/pool";

const program = createCommand();

program.name("load offchain").description("Manage a governance proposal");

program.action(async () => {
  logger.info("Make sure to run migrations before");
  const db = await initDb();

  logger.info("Cloning repository...");
  spawnSync("git", ["clone", repository, "token-registry", "--depth=1"], {
    encoding: "utf-8",
    cwd: "/tmp",
  });
  logger.info("Listing files...");
  const { stdout } = spawnSync("git", ["ls-tree", "HEAD"], {
    encoding: "utf-8",
    cwd: path.join("/tmp", "token-registry", subjectFolder),
  });

  const blobs = stdout
    .split("\n")
    .filter((line) => line.endsWith(".json"))
    .map((line) => {
      const [_permissions, _blob, hash, file] = line.split(/\s/);
      const contents = JSON.parse(
        fs.readFileSync(path.join("/tmp", "token-registry", subjectFolder, file), "utf-8")
      );
      return {
        hash,
        ...contents,
        subject: contents["subject"].toLowerCase(),
      };
    });

  logger.info("Upserting metadata...");
  await upsertMetadataWithHash(db, blobs);

  logger.info("Cleaning up...");
  spawnSync("rm", ["-rf", "token-registry"], {
    cwd: "/tmp",
  });
});

program.parse();
