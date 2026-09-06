import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  clean: true,
  sourcemap: true,

  noExternal: ["@us-stream/db", "@us-stream/livekit", "@us-stream/shared"],

  external: ["mongoose", "mongodb"],
});
