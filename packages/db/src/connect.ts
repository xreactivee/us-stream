import mongoose, { type Mongoose } from "mongoose";

/**
 * `sanitizeFilter` strips query operators out of values, so a request body
 * like `{ "email": { "$ne": null } }` can never turn into a filter that
 * matches every document. This is the NoSQL equivalent of using bound
 * parameters instead of string concatenation, and it is on globally rather
 * than per query so it cannot be forgotten.
 */
mongoose.set("sanitizeFilter", true);

/** Reject fields that are not in the schema instead of silently dropping them. */
mongoose.set("strictQuery", true);

interface ConnectionCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

/**
 * Serverless functions re-enter this module on every invocation and hot
 * reloading re-evaluates it on every edit. Caching on `globalThis` means one
 * connection per process rather than one per invocation.
 */
const globalForMongoose = globalThis as unknown as {
  usStreamMongoose?: ConnectionCache;
};

const cache: ConnectionCache = globalForMongoose.usStreamMongoose ?? {
  conn: null,
  promise: null,
};
globalForMongoose.usStreamMongoose = cache;

export interface ConnectOptions {
  uri: string;
  /**
   * Keep this small in serverless: every warm instance holds its own pool and
   * a MongoDB Atlas free cluster has a modest connection ceiling. The
   * long-running realtime service can afford more.
   */
  maxPoolSize?: number;
}

export async function connectToDatabase({
  uri,
  maxPoolSize = 5,
}: ConnectOptions): Promise<Mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      maxPoolSize,
      serverSelectionTimeoutMS: 10_000,
      // Fail immediately when the connection is down rather than queueing
      // operations that will time out later with no useful stack.
      bufferCommands: false,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    // Let the next call retry instead of caching a rejected promise forever.
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}

/**
 * The raw driver client behind Mongoose. Better Auth manages its own
 * collections through the MongoDB driver, and handing it this client keeps
 * everything on a single connection pool.
 */
export function getMongoClient() {
  return mongoose.connection.getClient();
}

export async function disconnectFromDatabase(): Promise<void> {
  if (cache.conn) {
    await cache.conn.disconnect();
    cache.conn = null;
    cache.promise = null;
  }
}

export { mongoose };
