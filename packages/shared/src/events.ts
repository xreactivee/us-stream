/**
 * The in-call wire protocol.
 *
 * Everything that is not audio or video travels over LiveKit data channels:
 * chat, reactions, raised hands, host commands, breakout moves and poll
 * notifications. Both ends validate against these schemas, so the protocol has
 * exactly one definition and a malformed payload can never reach the UI.
 */

import { z } from "zod";
import { CHAT_MESSAGE_MAX_LENGTH, POLL_QUESTION_MAX_LENGTH, REACTION_EMOJIS } from "./constants";

/**
 * LiveKit topics let a receiver filter without parsing. One topic per family of
 * events, matching the prefix of the event `type`.
 */
export const DATA_TOPICS = ["chat", "presence", "host", "breakout", "poll"] as const;
export type DataTopic = (typeof DATA_TOPICS)[number];

const identity = z.string().min(1).max(128);

// -------------------------------------------------------------------- chat --

export const chatMessageEvent = z.object({
  type: z.literal("chat.message"),
  /** Client-generated so the sender can render optimistically and de-duplicate. */
  id: z.uuid(),
  body: z.string().min(1).max(CHAT_MESSAGE_MAX_LENGTH),
  replyToId: z.uuid().nullish(),
  /** Private messages are delivered to a single participant. */
  toIdentity: identity.nullish(),
  sentAt: z.number().int().positive(),
});

export const chatTypingEvent = z.object({
  type: z.literal("chat.typing"),
  isTyping: z.boolean(),
});

// ---------------------------------------------------------------- presence --

export const reactionEvent = z.object({
  type: z.literal("presence.reaction"),
  emoji: z.enum(REACTION_EMOJIS),
  sentAt: z.number().int().positive(),
});

export const handEvent = z.object({
  type: z.literal("presence.hand"),
  raised: z.boolean(),
  /** Set when raising, so every client orders the speaking queue identically. */
  raisedAt: z.number().int().positive().nullish(),
});

// -------------------------------------------------------------------- host --

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
  /** `null` clears the spotlight and returns everyone to their own layout. */
  targetIdentity: identity.nullable(),
});

export const hostRoleChangedEvent = z.object({
  type: z.literal("host.roleChanged"),
  targetIdentity: identity,
  role: z.enum(["owner", "cohost", "member", "guest"]),
});

// ---------------------------------------------------------------- breakout --

export const breakoutMoveEvent = z.object({
  type: z.literal("breakout.move"),
  /** LiveKit room to reconnect to. */
  roomName: z.string().min(1),
  /** Fresh access token for that room; short-lived, single use. */
  token: z.string().min(1),
  closesAt: z.number().int().positive().nullable(),
});

export const breakoutRecallEvent = z.object({
  type: z.literal("breakout.recall"),
  roomName: z.string().min(1),
  token: z.string().min(1),
});

export const breakoutBroadcastEvent = z.object({
  type: z.literal("breakout.broadcast"),
  body: z.string().min(1).max(CHAT_MESSAGE_MAX_LENGTH),
  sentAt: z.number().int().positive(),
});

// ------------------------------------------------------------------- polls --

export const pollChangedEvent = z.object({
  type: z.literal("poll.changed"),
  pollId: z.uuid(),
  status: z.enum(["opened", "updated", "closed"]),
  /** Included on `opened` so clients can render without a round trip. */
  question: z.string().max(POLL_QUESTION_MAX_LENGTH).nullish(),
});

export const questionChangedEvent = z.object({
  type: z.literal("poll.questionChanged"),
  questionId: z.uuid(),
  status: z.enum(["asked", "upvoted", "answered"]),
});

// ------------------------------------------------------------------- union --

export const dataChannelEvent = z.discriminatedUnion("type", [
  chatMessageEvent,
  chatTypingEvent,
  reactionEvent,
  handEvent,
  hostMuteEvent,
  hostRemoveEvent,
  hostSpotlightEvent,
  hostRoleChangedEvent,
  breakoutMoveEvent,
  breakoutRecallEvent,
  breakoutBroadcastEvent,
  pollChangedEvent,
  questionChangedEvent,
]);

export type DataChannelEvent = z.infer<typeof dataChannelEvent>;
export type ChatMessageEvent = z.infer<typeof chatMessageEvent>;
export type ReactionEvent = z.infer<typeof reactionEvent>;
export type HandEvent = z.infer<typeof handEvent>;
export type BreakoutMoveEvent = z.infer<typeof breakoutMoveEvent>;

/** The topic an event must be published on, derived from its `type` prefix. */
export function topicFor(event: DataChannelEvent): DataTopic {
  return event.type.split(".", 1)[0] as DataTopic;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeEvent(event: DataChannelEvent): Uint8Array {
  return encoder.encode(JSON.stringify(event));
}

/**
 * Decodes a payload received from another participant. Returns `null` rather
 * than throwing: a peer can send anything, and one bad frame must not take the
 * call down.
 */
export function decodeEvent(payload: Uint8Array): DataChannelEvent | null {
  try {
    const parsed = dataChannelEvent.safeParse(JSON.parse(decoder.decode(payload)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
