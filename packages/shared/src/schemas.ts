/** Request and response shapes for the HTTP API, shared by client and server. */

import { z } from "zod";
import {
  BREAKOUT_MAX_ROOMS,
  BREAKOUT_MIN_ROOMS,
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_MIN_LENGTH,
  HARD_MAX_PARTICIPANTS,
  LOCALES,
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
  POLL_OPTION_MAX_LENGTH,
  POLL_QUESTION_MAX_LENGTH,
  QUESTION_MAX_LENGTH,
  ROOM_NAME_MAX_LENGTH,
  ROOM_NAME_MIN_LENGTH,
  ROOM_PASSWORD_MAX_LENGTH,
  ROOM_PASSWORD_MIN_LENGTH,
  ROOM_SLUG_MAX_LENGTH,
  ROOM_SLUG_PATTERN,
} from "./constants";
import { ROLES } from "./roles";

export const roomSlugSchema = z
  .string()
  .max(ROOM_SLUG_MAX_LENGTH)
  .regex(ROOM_SLUG_PATTERN, "invalid_room_slug");

export const displayNameSchema = z
  .string()
  .trim()
  .min(DISPLAY_NAME_MIN_LENGTH)
  .max(DISPLAY_NAME_MAX_LENGTH);

export const roomPasswordSchema = z
  .string()
  .min(ROOM_PASSWORD_MIN_LENGTH)
  .max(ROOM_PASSWORD_MAX_LENGTH);

export const createRoomSchema = z.object({
  name: z.string().trim().min(ROOM_NAME_MIN_LENGTH).max(ROOM_NAME_MAX_LENGTH),
  /** Persistent rooms keep their slug and history; instant meetings are disposable. */
  isPersistent: z.boolean().default(true),
  password: roomPasswordSchema.nullish(),
  waitingRoomEnabled: z.boolean().default(false),
  maxParticipants: z.number().int().min(2).max(HARD_MAX_PARTICIPANTS).nullish(),
  e2eeEnabled: z.boolean().default(false),
});
export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const updateRoomSchema = createRoomSchema.partial().extend({
  isLocked: z.boolean().optional(),
});
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

/**
 * Sent when joining. A signed-in user needs nothing but the room; a guest
 * supplies the name they want to appear under.
 */
export const joinRoomSchema = z.object({
  displayName: displayNameSchema.nullish(),
  password: z.string().max(ROOM_PASSWORD_MAX_LENGTH).nullish(),
});
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;

export const joinRoomResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("joined"),
    token: z.string(),
    serverUrl: z.string(),
    roomName: z.string(),
    identity: z.string(),
    role: z.enum(ROLES),
  }),
  /** The room has a waiting room and a host has not admitted this person yet. */
  z.object({
    status: z.literal("waiting"),
    requestId: z.uuid(),
  }),
  z.object({
    status: z.literal("rejected"),
    reason: z.enum([
      "password_required",
      "password_incorrect",
      "room_locked",
      "room_full",
      "denied",
    ]),
  }),
]);
export type JoinRoomResponse = z.infer<typeof joinRoomResponseSchema>;

/**
 * Host actions on other participants. These run on the server rather than from
 * the browser: LiveKit's moderation API is authenticated with the project's
 * secret, and routing through us is also where the "may this person do this to
 * that person" check lives.
 */
export const moderateRoomSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("mute"), targetIdentity: z.string().min(1).max(128) }),
  z.object({ action: z.literal("remove"), targetIdentity: z.string().min(1).max(128) }),
  z.object({ action: z.literal("muteAll") }),
  z.object({ action: z.literal("setLock"), locked: z.boolean() }),
]);
export type ModerateRoomInput = z.infer<typeof moderateRoomSchema>;

export const breakoutRoomSchema = z.object({
  count: z.number().int().min(BREAKOUT_MIN_ROOMS).max(BREAKOUT_MAX_ROOMS),
  /** `null` leaves the breakouts open until the host recalls everyone. */
  durationMinutes: z
    .number()
    .int()
    .min(1)
    .max(24 * 60)
    .nullable(),
});
export type BreakoutRoomInput = z.infer<typeof breakoutRoomSchema>;

export const createPollSchema = z.object({
  question: z.string().trim().min(1).max(POLL_QUESTION_MAX_LENGTH),
  options: z
    .array(z.string().trim().min(1).max(POLL_OPTION_MAX_LENGTH))
    .min(POLL_MIN_OPTIONS)
    .max(POLL_MAX_OPTIONS),
  allowMultiple: z.boolean().default(false),
  isAnonymous: z.boolean().default(true),
});
export type CreatePollInput = z.infer<typeof createPollSchema>;

export const votePollSchema = z.object({
  optionIndexes: z
    .array(
      z
        .number()
        .int()
        .min(0)
        .max(POLL_MAX_OPTIONS - 1),
    )
    .min(1),
});

export const askQuestionSchema = z.object({
  body: z.string().trim().min(1).max(QUESTION_MAX_LENGTH),
});

export const scheduleMeetingSchema = z.object({
  roomId: z.string().min(1).max(64),
  title: z.string().trim().min(1).max(120),
  /** Accepts the value an `<input type="datetime-local">` produces. */
  startsAt: z.coerce.date(),
  durationMinutes: z
    .number()
    .int()
    .min(5)
    .max(24 * 60),
});
export type ScheduleMeetingInput = z.infer<typeof scheduleMeetingSchema>;

export const updatePreferencesSchema = z.object({
  locale: z.enum(LOCALES).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
