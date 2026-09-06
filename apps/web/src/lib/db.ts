import "server-only";

import { connectToDatabase, getMongoClient } from "@us-stream/db";
import { env } from "@/env";

export function connectDb() {
  return connectToDatabase({ uri: env.MONGODB_URI, maxPoolSize: 5 });
}

export async function getAuthDbClient() {
  await connectDb();
  return getMongoClient();
}
