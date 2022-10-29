import dotenv from "dotenv";
dotenv.config();

export const options = {
  port: Number(process.env.PORT || 0),
  cors: process.env.CORS || "*",
  logLevel: process.env.LOG_LEVEL,
  db: process.env.DB_FILE,
  network: process.env.NETWORK || "1",
  isDevelopment: process.env.NODE_ENV !== "production",
  ogmios: {
    host: process.env.OGMIOS_HOST,
    port: Number(process.env.OGMIOS_PORT || 1337),
  },
  onchain: {
    syncFrom:
      process.env.EARLIEST_BLOCK_SLOT && process.env.EARLIEST_BLOCK_HASH
        ? {
            slot: Number(process.env.EARLIEST_BLOCK_SLOT),
            hash: process.env.EARLIEST_BLOCK_HASH,
          }
        : ("origin" as const),
  },
};
