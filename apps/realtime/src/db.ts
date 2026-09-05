import { createDb, createPool } from "@us-stream/db";
import { env } from "./env";

/**
 * A long-lived pool. Unlike the web app's serverless pool this process owns its
 * connections for its whole lifetime, so a larger pool is both safe and useful.
 */
export const pool = createPool({
  connectionString: env.DATABASE_URL,
  max: 10,
  // Railway Postgres terminates TLS at the proxy with a self-signed chain.
  ssl: env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
});

export const db = createDb(pool);
