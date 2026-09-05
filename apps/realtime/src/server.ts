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
import { pruneOrphans } from "@us-stream/db";
import Fastify from "fastify";
import { registerBreakoutRoutes } from "./breakout/route";
import { sweepExpiredBreakouts } from "./breakout/service";
import { connectDb, disconnectFromDatabase } from "./db";
import { env } from "./env";
import { registerLiveKitWebhook } from "./livekit/webhook";
import { flushAll } from "./yjs/registry";
import { registerYjsRoute } from "./yjs/route";

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

await registerLiveKitWebhook(app);
await registerYjsRoute(app);
registerBreakoutRoutes(app);

/**
 * The breakout countdown.
 *
 * Polled rather than scheduled per room: a timer held in memory is lost when
 * the service restarts, and people who were promised they would be brought
 * back in ten minutes should be, restart or not.
 */
const breakoutSweep = setInterval(() => {
  void sweepExpiredBreakouts().catch((error) => app.log.error({ error }, "breakout sweep failed"));
}, 15_000);

/**
 * Orphan cleanup.
 *
 * A room can be deleted while this service still holds its whiteboard in
 * memory; the next snapshot then writes a document whose room is gone. A TTL
 * index expiring a disposable room has the same effect, because it fires
 * without running any application code. Neither is visible to anyone — nothing
 * reads a child without its parent — but they accumulate.
 */
const orphanSweep = setInterval(() => {
  void pruneOrphans()
    .then(({ meetings, children }) => {
      if (meetings > 0 || children > 0) {
        app.log.info({ meetings, children }, "pruned orphaned records");
      }
    })
    .catch((error) => app.log.error({ error }, "orphan sweep failed"));
}, 10 * 60_000);

app.get("/health", async () => {
  const connection = await connectDb();
  await connection.connection.db?.admin().ping();
  return { status: "ok", uptime: process.uptime() };
});

async function start() {
  try {
    // Connect before listening so the service never reports ready while the
    // database is unreachable.
    await connectDb();
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    app.log.info(`${signal} received, shutting down`);
    clearInterval(breakoutSweep);
    clearInterval(orphanSweep);
    await app.close();
    // Nobody should lose a whiteboard because the service restarted.
    await flushAll();
    await disconnectFromDatabase();
    process.exit(0);
  });
}

await start();
