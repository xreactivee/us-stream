/** A meeting planned ahead of time; produces a calendar entry and a reminder. */

import { Schema, type Types } from "mongoose";
import { defineModel, type UserId } from "./define";

export interface ScheduledMeeting {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  createdById: UserId;
  title: string;
  startsAt: Date;
  durationMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

const scheduledMeetingSchema = new Schema<ScheduledMeeting>(
  {
    roomId: { type: Schema.Types.ObjectId, required: true, index: true },
    createdById: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    startsAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, default: 30 },
  },
  { timestamps: true, collection: "scheduled_meetings" },
);

scheduledMeetingSchema.index({ startsAt: 1 });

export const ScheduledMeetingModel = defineModel("ScheduledMeeting", scheduledMeetingSchema);
