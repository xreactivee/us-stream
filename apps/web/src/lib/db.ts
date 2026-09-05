import "server-only";

import { createDb, createPool, type Database, type Pool } from "@us-stream/db";
import { attachDatabasePool } from "@vercel/functions";
import { env } from "@/env";

/**
 * One pool per warm function instance.
 *
 * `attachDatabasePool` keeps the instance alive just long enough for idle
 * connections to leave the pool before Vercel suspends it, which is what stops
 * a busy deployment from exhausting Postgres' connection ceiling. The pool is
 * kept small for the same reason: every warm instance holds its own.
 *
 * The `globalThis` cache is for development, where hot reloading would
 * otherwise create a new pool on every edit.
 */
const globalForDb = globalThis as unknown as {
  usStreamPool?: Pool;
  usStreamDb?: Database;
};

function initialise(): { pool: Pool; db: Database } {
  const pool = createPool({
    connectionString: env.DATABASE_URL,
    max: 3,
    // Railway's Postgres proxy presents a self-signed certificate.
    ssl: env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  attachDatabasePool(pool);

  return { pool, db: createDb(pool) };
}

if (!globalForDb.usStreamDb) {
  const created = initialise();
  globalForDb.usStreamPool = created.pool;
  globalForDb.usStreamDb = created.db;
}

export const pool = globalForDb.usStreamPool as Pool;
export const db = globalForDb.usStreamDb as Database;
