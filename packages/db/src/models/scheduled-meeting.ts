import { Schema } from "mongoose";
import type { ScheduledMeeting } from "../types";
import { defineModel } from "./define";

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
