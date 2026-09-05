/**
 * Breakout rooms are separate LiveKit rooms. These rows are the orchestration
 * record: which sub-rooms exist for a meeting, who belongs in each, and when
 * the realtime service should pull everyone back to the main room.
 */

import { index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { meeting } from "./meetings";

export const breakoutRoom = pgTable(
  "breakout_room",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meeting.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** The LiveKit room name participants are moved into. */
    livekitRoomName: text("livekit_room_name").notNull().unique(),
    /** When the realtime service recalls everyone. Null means open-ended. */
    closesAt: timestamp("closes_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("breakout_room_meeting_id_idx").on(t.meetingId)],
);

export const breakoutAssignment = pgTable(
  "breakout_assignment",
  {
    breakoutRoomId: uuid("breakout_room_id")
      .notNull()
      .references(() => breakoutRoom.id, { onDelete: "cascade" }),
    participantIdentity: text("participant_identity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.breakoutRoomId, t.participantIdentity] })],
);
