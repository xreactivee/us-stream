import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  clean: true,
  sourcemap: true,
  // The workspace packages ship TypeScript source, so they are bundled in
  // rather than resolved at runtime.
  noExternal: ["@us-stream/db", "@us-stream/shared"],
});
