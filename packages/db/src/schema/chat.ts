/**
 * Chat is delivered live over LiveKit data channels; these rows exist so the
 * conversation survives the meeting and can be read back from its history.
 * The realtime service writes them, the web app only reads them.
 */

import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { meeting } from "./meetings";

export const message = pgTable(
  "message",
  {
    /** Generated on the sending client so the live event and the row share an id. */
    id: uuid("id").primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meeting.id, { onDelete: "cascade" }),
    senderIdentity: text("sender_identity").notNull(),
    senderName: text("sender_name").notNull(),
    body: text("body").notNull(),
    kind: text("kind").$type<"text" | "system">().notNull().default("text"),
    replyToId: uuid("reply_to_id"),
    /** Set for private messages; null for messages sent to the whole room. */
    toIdentity: text("to_identity"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("message_meeting_id_created_at_idx").on(t.meetingId, t.createdAt)],
);
