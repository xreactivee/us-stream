/**
 * Database access shared by the web app and the realtime service.
 *
 * The pool is created by the caller rather than here, because the two runtimes
 * need different lifecycles: Vercel functions hand their pool to
 * `attachDatabasePool` so idle connections close before the function suspends,
 * while the long-running Railway service keeps a conventional pool open.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema/index";

export * from "./schema/index";
export { schema };
export {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";

export interface CreatePoolOptions extends Omit<PoolConfig, "connectionString"> {
  connectionString: string;
  /**
   * Serverless functions should keep this small — every warm instance holds its
   * own pool, and Railway Postgres has a modest connection ceiling.
   */
  max?: number;
}

export function createPool(options: CreatePoolOptions): Pool {
  return new Pool({
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ...options,
  });
}

export function createDb(pool: Pool) {
  return drizzle(pool, { schema, casing: "snake_case" });
}

export type Database = ReturnType<typeof createDb>;
export { Pool };
