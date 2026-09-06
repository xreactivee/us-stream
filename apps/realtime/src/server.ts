/**
 * The realtime service.
 *
 * It exists because Vercel functions cannot hold a persistent WebSocket or run
 * a timer. Everything that needs one lives here:
 *
 *   - Yjs synchronisation for the whiteboard and shared notes (phase 5)
 *   - LiveKit webhooks, turned into meeting and participant rows (phase 2)
 *   - Closing meetings whose LiveKit room has gone (phase 8)
 *
 * Everything else stays in the Next.js app.
 */

import cors from "@fastify/cors";
import { pruneOrphans } from "@us-stream/db";
import Fastify from "fastify";
import { connectDb, disconnectFromDatabase } from "./db";
import { env } from "./env";
import { registerLiveKitWebhook } from "./livekit/webhook";
import { sweepFinishedMeetings } from "./meetings/sweep";
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

/**
 * Closing meetings that have actually finished.
 *
 * LiveKit's `room_finished` webhook does this too and does it faster, but it
 * needs a publicly reachable service. Asking LiveKit which rooms are still
 * alive reaches the same conclusion from this side, so a local setup and a
 * misconfigured webhook both still end their meetings.
 */
const callSweep = setInterval(() => {
  void sweepFinishedMeetings()
    .then((closed) => {
      if (closed > 0) {
        app.log.info({ closed }, "closed meetings whose LiveKit room had gone");
      }
    })
    .catch((error) => app.log.error({ error }, "meeting sweep failed"));
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
    clearInterval(callSweep);
    clearInterval(orphanSweep);
    await app.close();
    // Nobody should lose a whiteboard because the service restarted.
    await flushAll();
    await disconnectFromDatabase();
    process.exit(0);
  });
}

await start();
