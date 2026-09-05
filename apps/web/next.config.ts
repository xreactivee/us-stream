import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// The single .env at the repository root is loaded by `dotenv-cli` in this
// package's scripts, before Next starts. Loading it from inside this file does
// not work: Next calls `@next/env`'s loadEnvConfig itself for the app
// directory, and that resets process.env to the snapshot it took first, wiping
// anything added afterwards. Setting the variables in the parent process makes
// them part of that snapshot instead.
//
// On Vercel and Railway the file is absent and the platform's own variables are
// used; dotenv-cli tolerates the missing file and carries on.

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // The workspace packages ship TypeScript source rather than a build output,
  // so Next has to compile them itself.
  transpilePackages: ["@us-stream/db", "@us-stream/livekit", "@us-stream/shared"],

  // Mongoose registers models on a module-level singleton and the MongoDB
  // driver loads optional native dependencies; neither survives bundling.
  serverExternalPackages: ["mongoose", "mongodb"],

  typescript: {
    ignoreBuildErrors: false,
  },
};

export default withNextIntl(nextConfig);
