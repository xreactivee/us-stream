import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@us-stream/db", "@us-stream/livekit", "@us-stream/shared"],

  serverExternalPackages: ["mongoose", "mongodb"],

  typescript: {
    ignoreBuildErrors: false,
  },
};

export default withNextIntl(nextConfig);
