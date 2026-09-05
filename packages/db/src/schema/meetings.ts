/**
 * A `meeting` is one occupied session of a room — the span between LiveKit's
 * `room_started` and `room_finished` webhooks. Chat, polls and breakout rooms
 * all hang off a meeting rather than the room, so a persistent room's history
 * stays separated by occasion.
 */

import type { Role } from "@us-stream/shared";
import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { room } from "./rooms";

export const meeting = pgTable(
  "meeting",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => room.id, { onDelete: "cascade" }),
    /** LiveKit's own room identifier, so webhooks can be matched to a row. */
    livekitRoomSid: text("livekit_room_sid").unique(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [
    index("meeting_room_id_idx").on(t.roomId),
    index("meeting_started_at_idx").on(t.startedAt),
  ],
);

export const participant = pgTable(
  "participant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meeting.id, { onDelete: "cascade" }),
    /**
     * The LiveKit identity. Stable for the duration of one meeting and unique
     * within it; this is what data-channel events address.
     */
    identity: text("identity").notNull(),
    /** Null for guests who joined by link without an account. */
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    displayName: text("display_name").notNull(),
    role: text("role").$type<Role>().notNull().default("member"),

    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    leftAt: timestamp("left_at", { withTimezone: true }),
    /** Accumulated speaking time, used for the post-meeting talk-time breakdown. */
    speakingMs: integer("speaking_ms").notNull().default(0),
  },
  (t) => [
    index("participant_meeting_id_idx").on(t.meetingId),
    index("participant_user_id_idx").on(t.userId),
  ],
);

/**
 * Someone held in the waiting room. A host resolves the row by admitting or
 * denying; the waiting client polls its own request until then.
 */
export const admissionRequest = pgTable(
  "admission_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => room.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    status: text("status").$type<"pending" | "admitted" | "denied">().notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("admission_request_room_id_status_idx").on(t.roomId, t.status)],
);
