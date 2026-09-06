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
  noExternal: ["@us-stream/db", "@us-stream/livekit", "@us-stream/shared"],
  /*
   * Mongoose and the MongoDB driver are loaded at runtime, never bundled.
   *
   * They reach this build through `@us-stream/db`, which is inlined above, and
   * the driver calls `require()` on Node built-ins from inside its own code.
   * An ESM bundle has no `require`, so esbuild replaces those calls with a
   * throw and the process dies on its first line with
   * `Dynamic require of "fs" is not supported` — at startup, not at the first
   * query, so nothing about it looks like a database problem.
   *
   * `mongoose` is also a declared dependency of this package, which is what
   * makes it resolvable from `dist/` once it is external. The web app keeps the
   * same two out of its bundle for the same reason, via
   * `serverExternalPackages` in `next.config.ts`.
   */
  external: ["mongoose", "mongodb"],
});
