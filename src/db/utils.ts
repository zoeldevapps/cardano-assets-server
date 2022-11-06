import _ from "lodash";
import { DatabaseConnection, sql } from "slonik";
import { logger } from "../logger";
import { asset } from "./schema";

export async function createOrFindAssets(db: DatabaseConnection, subjects: string[], currentSlot: number) {
  if (subjects.length === 0) {
    return {};
  }

  const query = sql.type(asset.pick({ id: true, subject: true }))`
    INSERT INTO raw_asset (subject, last_interacted)
    SELECT DECODE(subject_hex, 'hex'), slot
    FROM ${sql.unnest(
      _.uniq(subjects).map((subject) => [subject, currentSlot]),
      ["text", "int8"]
    )} AS T(subject_hex, slot)
    ON CONFLICT (subject) DO UPDATE SET last_interacted = EXCLUDED.last_interacted
    RETURNING id, ENCODE(subject, 'hex') AS "subject"
  `;

  try {
    const { rows } = await db.query(query);

    const assetMapping = Object.fromEntries(rows.map((row) => [row.subject, row.id]));

    return assetMapping;
  } catch (err) {
    logger.error({ err, query }, "Unable to upsert assets");
    throw err;
  }
}
