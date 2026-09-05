/**
 * Yjs document snapshots for the whiteboard and the shared notes.
 *
 * These belong to the room rather than a single meeting: a team returning to
 * the same room expects to find the board as they left it. The realtime service
 * writes the snapshot periodically and once more when the last client
 * disconnects.
 */

import { DOC_KINDS, type DocKind } from "@us-stream/shared";
import { Schema, type Types } from "mongoose";
import { defineModel } from "./define";

export interface CollaborativeDoc {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  kind: DocKind;
  /** Encoded Yjs state. Opaque binary; only Yjs interprets it. */
  state: Buffer;
  updatedAt: Date;
  createdAt: Date;
}

const docSchema = new Schema<CollaborativeDoc>(
  {
    roomId: { type: Schema.Types.ObjectId, required: true },
    kind: { type: String, enum: DOC_KINDS, required: true },
    state: { type: Buffer, required: true },
  },
  { timestamps: true, collection: "docs" },
);

docSchema.index({ roomId: 1, kind: 1 }, { unique: true });

export const DocModel = defineModel("Doc", docSchema);
