import {
  isAllegraBlock,
  isAlonzoBlock,
  isBabbageBlock,
  isByronBlock,
  isMaryBlock,
  isShelleyBlock,
  Schema,
} from "@cardano-ogmios/client";
import _ from "lodash";
import { match, P } from "ts-pattern";

import { Block as DbBlock } from "../db";

export type SupportedBlock =
  | ({
      type: "Babbage";
    } & Schema.BlockBabbage)
  | ({
      type: "Alonzo";
    } & Schema.BlockAlonzo)
  | ({
      type: "Mary";
    } & Schema.BlockMary);

export type SupportedTx = Schema.TxAlonzo | Schema.TxBabbage | Schema.TxMary;

export type Recorder = (block: SupportedBlock, dbBlock: DbBlock) => Promise<void>;
export type Rollback = (point: Schema.PointOrOrigin) => Promise<void>;

const exhaustiveGuard = (_: never): never => {
  throw new Error("Exhaustive guard");
};

export function getSupportedBlock(block: Schema.Block): SupportedBlock | null {
  if (isByronBlock(block) || isAllegraBlock(block) || isShelleyBlock(block)) {
    // tokens were not supported in these eras
    return null;
  } else if (isBabbageBlock(block)) {
    // do a bit of monkeypatching for performance reasons
    return Object.assign(block.babbage, { type: "Babbage" as const });
  } else if (isAlonzoBlock(block)) {
    return Object.assign(block.alonzo, { type: "Alonzo" as const });
  } else if (isMaryBlock(block)) {
    return Object.assign(block.mary, { type: "Mary" as const });
  }

  return exhaustiveGuard(block);
}

/**
 * Lossy parse of metadatum into a JS format.
 * bytes -> base16 string
 * int -> bigint
 * map -> Record<string, *>
 */
export function parseMetadatumLossy(metadatum: Schema.Metadatum): unknown {
  return match(metadatum)
    .with({ int: P.select("val") }, ({ val }) => BigInt(val))
    .with({ string: P.select("val") }, ({ val }) => val)
    .with({ bytes: P.select("val") }, ({ val }) => val /* use the hex encoded bytes */)
    .with({ list: P.select("val") }, ({ val }) => val.map(parseMetadatumLossy))
    .with({ map: P.select("val") }, ({ val }) => {
      const record: Record<string, unknown> = {};
      val.forEach(({ k, v }) => {
        const objKey = parseMetadatumLossy(k);
        // in case it was a split string key, join it
        // as default the obj could be stringified.
        // this is less strict and won't work with non-string keys
        const key = joinStringIfNeeded(objKey) || String(objKey);
        record[key] = parseMetadatumLossy(v);
      });
      return record;
    })
    .exhaustive();
}

/**
 * Expects either a string or an array of strings that was split because of
 * the metadatum constraints
 */
export function joinStringIfNeeded(value: unknown): string | null {
  if (_.isArray(value) && (value.length === 0 || _.isString(value[0]))) {
    return value.join("");
  } else if (_.isString(value)) {
    return value;
  } else {
    return null;
  }
}

export function safeJSONStringify(obj: unknown): string {
  return JSON.stringify(
    obj,
    (_key, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged
  );
}
