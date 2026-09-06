import mongoose, { type Mongoose } from "mongoose";
import type { ConnectOptions } from "./types";

mongoose.set("sanitizeFilter", true);
mongoose.set("strictQuery", true);

interface ConnectionCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

const globalForMongoose = globalThis as unknown as {
  usStreamMongoose?: ConnectionCache;
};

const cache: ConnectionCache = globalForMongoose.usStreamMongoose ?? {
  conn: null,
  promise: null,
};
globalForMongoose.usStreamMongoose = cache;

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
      bufferCommands: false,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}

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
