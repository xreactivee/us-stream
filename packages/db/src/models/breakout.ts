/**
 * Breakout rooms are separate LiveKit rooms. These documents are the
 * orchestration record: which sub-rooms exist for a meeting, who belongs in
 * each, and when the realtime service should pull everyone back.
 */

import { Schema, type Types } from "mongoose";
import { defineModel } from "./define";

export interface BreakoutRoom {
  _id: Types.ObjectId;
  meetingId: Types.ObjectId;
  name: string;
  /** The LiveKit room name participants are moved into. */
  livekitRoomName: string;
  /** Participant identities assigned to this sub-room. */
  assignments: string[];
  /** When the realtime service recalls everyone. `null` means open-ended. */
  closesAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const breakoutRoomSchema = new Schema<BreakoutRoom>(
  {
    meetingId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true },
    livekitRoomName: { type: String, required: true, unique: true },
    assignments: { type: [String], default: [] },
    closesAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "breakout_rooms" },
);

// The realtime service sweeps for sub-rooms whose time is up.
breakoutRoomSchema.index({ closesAt: 1, closedAt: 1 });

export const BreakoutRoomModel = defineModel("BreakoutRoom", breakoutRoomSchema);
