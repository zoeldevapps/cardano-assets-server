/* eslint-disable @typescript-eslint/no-var-requires */
const { SlonikMigrator } = require("@slonik/migrator");
const { createPool, sql } = require("slonik");
const dotenv = require("dotenv");

dotenv.config();

const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_DATABASE, DB_SCHEMA } = process.env;

(async () => {
  // in an existing slonik project, this would usually be setup in another module
  const slonik = await createPool(
    `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`,
    {
      interceptors: [
        {
          afterPoolConnection: async (_context, conn) => {
            await conn.query(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier([DB_SCHEMA])}`);
            await conn.query(sql`SET search_path TO ${sql.identifier([DB_SCHEMA])}, public`);
            return null;
          },
        },
      ],
    }
  );

  const migrator = new SlonikMigrator({
    migrationsPath: __dirname + "/migrations",
    migrationTableName: "migration",
    slonik,
  });

  migrator.runAsCLI();
})();
