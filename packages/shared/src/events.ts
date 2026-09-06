import { z } from "zod";
import { CHAT_MESSAGE_MAX_LENGTH, POLL_QUESTION_MAX_LENGTH, REACTION_EMOJIS } from "./constants";
import type { DataChannelEvent, DataTopic } from "./types";

export const DATA_TOPICS = ["chat", "presence", "host", "poll"] as const;

const identity = z.string().min(1).max(128);

export const chatMessageEvent = z.object({
  type: z.literal("chat.message"),
  id: z.uuid(),
  body: z.string().min(1).max(CHAT_MESSAGE_MAX_LENGTH),
  replyToId: z.uuid().nullish(),
  toIdentity: identity.nullish(),
  sentAt: z.number().int().positive(),
});

export const chatTypingEvent = z.object({
  type: z.literal("chat.typing"),
  isTyping: z.boolean(),
});

export const reactionEvent = z.object({
  type: z.literal("presence.reaction"),
  emoji: z.enum(REACTION_EMOJIS),
  sentAt: z.number().int().positive(),
});

export const handEvent = z.object({
  type: z.literal("presence.hand"),
  raised: z.boolean(),
  raisedAt: z.number().int().positive().nullish(),
});

export const hostMuteEvent = z.object({
  type: z.literal("host.mute"),
  targetIdentity: identity,
  track: z.enum(["audio", "video", "screen"]),
});

export const hostRemoveEvent = z.object({
  type: z.literal("host.remove"),
  targetIdentity: identity,
  reason: z.string().max(200).nullish(),
});

export const hostSpotlightEvent = z.object({
  type: z.literal("host.spotlight"),
  targetIdentity: identity.nullable(),
});

export const hostRoleChangedEvent = z.object({
  type: z.literal("host.roleChanged"),
  targetIdentity: identity,
  role: z.enum(["owner", "cohost", "member", "guest"]),
});

export const pollChangedEvent = z.object({
  type: z.literal("poll.changed"),
  pollId: z.uuid(),
  status: z.enum(["opened", "updated", "closed"]),
  question: z.string().max(POLL_QUESTION_MAX_LENGTH).nullish(),
});

export const questionChangedEvent = z.object({
  type: z.literal("poll.questionChanged"),
  questionId: z.uuid(),
  status: z.enum(["asked", "upvoted", "answered"]),
});

export const dataChannelEvent = z.discriminatedUnion("type", [
  chatMessageEvent,
  chatTypingEvent,
  reactionEvent,
  handEvent,
  hostMuteEvent,
  hostRemoveEvent,
  hostSpotlightEvent,
  hostRoleChangedEvent,
  pollChangedEvent,
  questionChangedEvent,
]);

export function topicFor(event: DataChannelEvent): DataTopic {
  return event.type.split(".", 1)[0] as DataTopic;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeEvent(event: DataChannelEvent): Uint8Array<ArrayBuffer> {
  return new Uint8Array(encoder.encode(JSON.stringify(event)));
}

export function decodeEvent(payload: Uint8Array): DataChannelEvent | null {
  try {
    const parsed = dataChannelEvent.safeParse(JSON.parse(decoder.decode(payload)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
