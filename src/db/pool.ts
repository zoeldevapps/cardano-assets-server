import { createPool } from "slonik";
import { createResultParserInterceptor, createUseSchemaInterceptor } from "./interceptor";
import { options } from "../config";
import { createFieldNameTransformationInterceptor } from "slonik-interceptor-field-name-transformation";

export const initDb = () => {
  const { db } = options;
  return createPool(`postgresql://${db.user}:${db.password}@${db.host}:${db.port}/${db.database}`, {
    interceptors: [
      createUseSchemaInterceptor(db.schema),
      createFieldNameTransformationInterceptor({
        format: "CAMEL_CASE",
      }),
      createResultParserInterceptor(),
    ],
    typeParsers: [
      {
        // bigint support for all int8
        name: "int8",
        parse(value) {
          return BigInt(value);
        },
      },
    ],
    maximumPoolSize: 25,
  });
};
