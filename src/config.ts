import dotenv from "dotenv";
dotenv.config();

export const options = {
  port: Number(process.env.PORT || 0),
  logLevel: process.env.LOG_LEVEL,
  db: process.env.DB_FILE,
  network: process.env.NETWORK || "1",
  isDevelopment: process.env.NODE_ENV !== "production",
};
