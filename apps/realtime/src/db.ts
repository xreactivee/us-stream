import { connectToDatabase, disconnectFromDatabase } from "@us-stream/db";
import { env } from "./env";

export function connectDb() {
  return connectToDatabase({ uri: env.MONGODB_URI, maxPoolSize: 10 });
}

export { disconnectFromDatabase };
