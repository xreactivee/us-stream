/**
 * Rooms are the durable thing users own. A room can be persistent (a stable
 * invite link people return to, like a personal meeting room) or disposable
 * (created for one instant meeting and never reused).
 *
 * Enum-like columns are plain `text` with a TypeScript type attached rather
 * than Postgres enums: the allowed values are already enforced by the Zod
 * schemas in `@us-stream/shared`, and text columns do not need a migration
 * every time a value is added.
 */

import type { Role } from "@us-stream/shared";
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const room = pgTable(
  "room",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Human-readable invite slug, e.g. `mavi-kedi-4821`. Part of the public URL. */
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    isPersistent: boolean("is_persistent").notNull().default(true),
    /** Argon2 hash. Null means the room has no password. */
    passwordHash: text("password_hash"),
    waitingRoomEnabled: boolean("waiting_room_enabled").notNull().default(false),
    /** A locked room refuses everyone who is not already inside. */
    isLocked: boolean("is_locked").notNull().default(false),
    e2eeEnabled: boolean("e2ee_enabled").notNull().default(false),
    maxParticipants: integer("max_participants"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    /** Disposable rooms are swept after this instant. Null for persistent rooms. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [index("room_owner_id_idx").on(t.ownerId), index("room_expires_at_idx").on(t.expiresAt)],
);

/**
 * Persistent membership: who has a standing role in a room. People who join by
 * link without an account are not members — their role lives on the
 * `participant` row for that one meeting.
 */
export const roomMember = pgTable(
  "room_member",
  {
    roomId: uuid("room_id")
      .notNull()
      .references(() => room.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").$type<Role>().notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.roomId, t.userId] }),
    index("room_member_user_id_idx").on(t.userId),
  ],
);

/** A meeting scheduled ahead of time; produces a calendar entry and a reminder. */
export const scheduledMeeting = pgTable(
  "scheduled_meeting",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => room.id, { onDelete: "cascade" }),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(30),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("scheduled_meeting_starts_at_idx").on(t.startsAt)],
);
