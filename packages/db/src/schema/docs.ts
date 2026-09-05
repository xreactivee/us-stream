/**
 * Yjs document snapshots for the whiteboard and the shared notes.
 *
 * These belong to the room rather than a single meeting: a team returning to
 * the same room expects to find the board as they left it. The realtime
 * service writes the snapshot periodically and once more when the last client
 * disconnects.
 */

import type { DocKind } from "@us-stream/shared";
import { customType, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { room } from "./rooms";

/** Yjs state is an opaque binary update; Postgres stores it as `bytea`. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const doc = pgTable(
  "doc",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => room.id, { onDelete: "cascade" }),
    kind: text("kind").$type<DocKind>().notNull(),
    /** Encoded Yjs state vector update. Empty for a document nobody has touched. */
    state: bytea("state").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("doc_room_id_kind_idx").on(t.roomId, t.kind)],
);
