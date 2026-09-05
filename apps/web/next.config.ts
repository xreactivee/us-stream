import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// The repository keeps a single .env at its root so the web app, the realtime
// service and the migration tooling cannot drift apart. Next only looks inside
// its own directory, so the root file is loaded explicitly here.
loadEnvConfig(new URL("../..", import.meta.url).pathname);

const nextConfig: NextConfig = {
  // The workspace packages ship TypeScript source rather than a build output,
  // so Next has to compile them itself.
  transpilePackages: ["@us-stream/db", "@us-stream/shared"],

  // `pg` opens raw sockets and must stay a real Node module instead of being
  // bundled into the server output.
  serverExternalPackages: ["pg"],

  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
