import "server-only";

import { connectToDatabase, getMongoClient } from "@us-stream/db";
import { env } from "@/env";

/**
 * Opens the shared Mongoose connection, or returns the existing one.
 *
 * Every route handler and server component that touches the database must
 * await this first. `bufferCommands` is off, so a query issued before the
 * connection is up fails immediately rather than hanging.
 *
 * The pool is deliberately small: each warm Vercel instance keeps its own, and
 * a MongoDB Atlas free cluster has a modest connection ceiling.
 */
export function connectDb() {
  return connectToDatabase({ uri: env.MONGODB_URI, maxPoolSize: 5 });
}

/**
 * The raw driver client, for Better Auth — it manages its own collections
 * through the MongoDB driver rather than Mongoose, and sharing this client
 * keeps everything on one pool.
 */
export async function getAuthDbClient() {
  await connectDb();
  return getMongoClient();
}
