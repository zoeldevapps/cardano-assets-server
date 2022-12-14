import { type Interceptor, type QueryResultRow, SchemaValidationError, SerializableValue, sql } from "slonik";

export const createResultParserInterceptor = (): Interceptor => {
  return {
    // If you are not going to transform results using Zod, then you should use `afterQueryExecution` instead.
    // Future versions of Zod will provide a more efficient parser when parsing without transformations.
    // You can even combine the two – use `afterQueryExecution` to validate results, and (conditionally)
    // transform results as needed in `transformRow`.
    transformRow: (executionContext, actualQuery, row) => {
      const { resultParser } = executionContext;

      if (!resultParser) {
        return row;
      }

      const validationResult = resultParser.safeParse(row);

      if (!validationResult.success) {
        throw new SchemaValidationError(actualQuery, row as SerializableValue, validationResult.error.issues);
      }

      return validationResult.data as QueryResultRow;
    },
  };
};

export const createUseSchemaInterceptor = (schema?: string): Interceptor => {
  return {
    afterPoolConnection: async (_context, conn) => {
      if (schema) {
        await conn.query(
          sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier([schema])}; SET search_path TO ${sql.identifier([
            schema,
          ])}, public`
        );
      }
      return null;
    },
  };
};
