/**
 * The realtime service.
 *
 * It exists because Vercel functions cannot hold a persistent WebSocket or run
 * a timer. Everything that needs one lives here:
 *
 *   - Yjs synchronisation for the whiteboard and shared notes (phase 5)
 *   - LiveKit webhooks, turned into meeting and participant rows (phase 2)
 *   - Breakout room countdowns and recalls (phase 6)
 *
 * Everything else stays in the Next.js app.
 */

import cors from "@fastify/cors";
import Fastify from "fastify";
import { pool } from "./db";
import { env } from "./env";

const app = Fastify({
  logger: {
    level: env.NODE_ENV === "production" ? "info" : "debug",
    transport: env.NODE_ENV === "production" ? undefined : { target: "pino-pretty" },
  },
  // Railway terminates TLS in front of the container.
  trustProxy: true,
});

await app.register(cors, {
  origin: env.ALLOWED_ORIGINS,
  credentials: true,
});

app.get("/health", async () => {
  await pool.query("select 1");
  return { status: "ok", uptime: process.uptime() };
});

async function start() {
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    app.log.info(`${signal} received, shutting down`);
    await app.close();
    await pool.end();
    process.exit(0);
  });
}

await start();
