import { timingSafeEqual } from "node:crypto";
import { Types } from "@us-stream/db";
import { BREAKOUT_MAX_ROOMS, BREAKOUT_MIN_ROOMS, CHAT_MESSAGE_MAX_LENGTH } from "@us-stream/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { env } from "../env";
import { broadcastToBreakouts, openBreakouts, recallBreakouts } from "./service";

const roomIdSchema = z.string().refine((value) => Types.ObjectId.isValid(value), "invalid_room_id");

const openSchema = z.object({
  roomId: roomIdSchema,
  count: z.number().int().min(BREAKOUT_MIN_ROOMS).max(BREAKOUT_MAX_ROOMS),
  durationMinutes: z
    .number()
    .int()
    .min(1)
    .max(24 * 60)
    .nullable(),
  keepIdentities: z.array(z.string().min(1).max(128)).max(64).default([]),
});

const recallSchema = z.object({ roomId: roomIdSchema });

const broadcastSchema = z.object({
  roomId: roomIdSchema,
  body: z.string().min(1).max(CHAT_MESSAGE_MAX_LENGTH),
});

/**
 * Constant-time comparison, so a caller cannot learn the secret one character
 * at a time from how long the check takes.
 */
function secretMatches(provided: string | undefined): boolean {
  if (!provided) {
    return false;
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(env.REALTIME_INTERNAL_SECRET);

  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Breakout orchestration, called only by the web app.
 *
 * These endpoints move people between rooms and take no view of who is allowed
 * to ask — that check belongs where the session lives, in the web app, which
 * has already established that the caller is a host of this room. The shared
 * secret is what makes "the web app said so" believable.
 */
export function registerBreakoutRoutes(app: FastifyInstance) {
  const guard = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!secretMatches(request.headers["x-internal-secret"] as string | undefined)) {
      await reply.code(401).send({ error: "unauthorised" });
    }
  };

  app.post("/internal/breakouts/open", { preHandler: guard }, async (request, reply) => {
    const body = openSchema.safeParse(request.body);

    if (!body.success) {
      return reply.code(400).send({ error: "invalid_body" });
    }

    try {
      const result = await openBreakouts({
        roomId: new Types.ObjectId(body.data.roomId),
        count: body.data.count,
        durationMinutes: body.data.durationMinutes,
        keepIdentities: body.data.keepIdentities,
      });

      return reply.send(result);
    } catch (error) {
      request.log.error({ error }, "could not open breakout rooms");
      return reply.code(409).send({ error: "no_active_meeting" });
    }
  });

  app.post("/internal/breakouts/recall", { preHandler: guard }, async (request, reply) => {
    const body = recallSchema.safeParse(request.body);

    if (!body.success) {
      return reply.code(400).send({ error: "invalid_body" });
    }

    return reply.send(await recallBreakouts(new Types.ObjectId(body.data.roomId)));
  });

  app.post("/internal/breakouts/broadcast", { preHandler: guard }, async (request, reply) => {
    const body = broadcastSchema.safeParse(request.body);

    if (!body.success) {
      return reply.code(400).send({ error: "invalid_body" });
    }

    return reply.send(
      await broadcastToBreakouts(new Types.ObjectId(body.data.roomId), body.data.body),
    );
  });
}
