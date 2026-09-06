import { config as loadEnv } from "dotenv";
import { connectToDatabase, disconnectFromDatabase, mongoose } from "../connect";

loadEnv({ path: "../../.env", quiet: true });

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not set — copy .env.example to .env at the repository root.");
}

await connectToDatabase({ uri, maxPoolSize: 2 });

const db = mongoose.connection.db;

if (!db) {
  throw new Error("Connected, but no database was selected — is a name missing from the URI?");
}

const hello = await db.admin().command({ hello: 1 });
const collections = await db.listCollections().toArray();

console.log(`database    ${db.databaseName}`);
console.log(`replica set ${hello.setName ?? "(not a replica set)"}`);
console.log(`primary     ${hello.primary ?? "(none reported)"}`);
console.log(`collections ${collections.map((entry) => entry.name).join(", ") || "(none yet)"}`);

await disconnectFromDatabase();
console.log("\nConnection OK.");
