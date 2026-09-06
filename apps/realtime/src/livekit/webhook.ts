import { MeetingModel, trusted } from "@us-stream/db";
import type { FastifyInstance } from "fastify";
import { WebhookReceiver } from "livekit-server-sdk";
import { env } from "../env";
import { roomIdFromName } from "./room-name";

const receiver = new WebhookReceiver(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);

export async function registerLiveKitWebhook(app: FastifyInstance) {
  app.addContentTypeParser(
    "application/webhook+json",
    { parseAs: "string" },
    (_request, body, done) => done(null, body),
  );

  app.post("/livekit/webhook", async (request, reply) => {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return reply.code(401).send({ error: "missing_authorization" });
    }

    let event: Awaited<ReturnType<typeof receiver.receive>>;

    try {
      event = await receiver.receive(request.body as string, authorization);
    } catch (error) {
      request.log.warn({ error }, "rejected a LiveKit webhook with a bad signature");
      return reply.code(401).send({ error: "invalid_signature" });
    }

    const roomId = roomIdFromName(event.room?.name);

    if (!roomId) {
      return reply.send({ ok: true, ignored: true });
    }

    const sid = event.room?.sid ?? null;

    switch (event.event) {
      case "room_started": {
        await MeetingModel.findOneAndUpdate(
          { livekitRoomSid: sid },
          { $setOnInsert: { roomId, livekitRoomSid: sid, startedAt: new Date() } },
          { upsert: true },
        );
        break;
      }

      case "participant_joined": {
        const participant = event.participant;

        if (participant) {
          const metadata = safeMetadata(participant.metadata);

          await MeetingModel.updateOne(
            {
              livekitRoomSid: sid,
              "participants.identity": trusted({ $ne: participant.identity }),
            },
            {
              $push: {
                participants: {
                  identity: participant.identity,
                  userId: metadata.userId ?? null,
                  displayName: participant.name || participant.identity,
                  role: metadata.role ?? "guest",
                  joinedAt: new Date(),
                  leftAt: null,
                  speakingMs: 0,
                },
              },
            },
          );
        }
        break;
      }

      case "participant_left": {
        if (event.participant) {
          await MeetingModel.updateOne(
            { livekitRoomSid: sid, "participants.identity": event.participant.identity },
            { $set: { "participants.$.leftAt": new Date() } },
          );
        }
        break;
      }

      case "room_finished": {
        await MeetingModel.updateOne(
          { livekitRoomSid: sid, endedAt: null },
          { $set: { endedAt: new Date() } },
        );
        break;
      }

      default:
        break;
    }

    return reply.send({ ok: true });
  });
}

function safeMetadata(raw: string | undefined): { role?: string; userId?: string } {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as { role?: string; userId?: string };
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
