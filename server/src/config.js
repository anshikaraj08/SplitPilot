import dotenv from "dotenv";
import path from "node:path";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

export const config = {
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "splitpilot-local-secret",
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  usdToInrRate: Number(process.env.USD_TO_INR_RATE || 83),
};

if (!config.databaseUrl && process.env.NODE_ENV !== "test") {
  console.warn("DATABASE_URL is not set. Database routes will fail until it is configured.");
}
