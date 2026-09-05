import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Single .env at the repository root, shared with the web app and the
// realtime service.
loadEnv({ path: "../../.env", quiet: true });

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env at the repository root.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url },
  // Matches the `casing` passed to drizzle() in src/index.ts.
  casing: "snake_case",
  strict: true,
  verbose: true,
});
