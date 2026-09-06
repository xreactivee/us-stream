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
  trustProxy: true,
});

await app.register(cors, {
  origin: env.ALLOWED_ORIGINS,
  credentials: true,
});

await registerLiveKitWebhook(app);
await registerYjsRoute(app);

const callSweep = setInterval(() => {
  void sweepFinishedMeetings()
    .then((closed) => {
      if (closed > 0) {
        app.log.info({ closed }, "closed meetings whose LiveKit room had gone");
      }
    })
    .catch((error) => app.log.error({ error }, "meeting sweep failed"));
}, 15_000);

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
    await flushAll();
    await disconnectFromDatabase();
    process.exit(0);
  });
}

await start();
