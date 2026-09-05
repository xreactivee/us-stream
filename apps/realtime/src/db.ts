import { connectToDatabase, disconnectFromDatabase } from "@us-stream/db";
import { env } from "./env";

/**
 * Unlike the web app's serverless connection, this process owns its pool for
 * its whole lifetime, so a larger one is both safe and useful.
 */
export function connectDb() {
  return connectToDatabase({ uri: env.MONGODB_URI, maxPoolSize: 10 });
}

export { disconnectFromDatabase };
