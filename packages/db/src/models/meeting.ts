import { ROLES } from "@us-stream/shared";
import { Schema } from "mongoose";
import type { AdmissionRequest, Meeting, MeetingParticipant } from "../types";
import { defineModel } from "./define";

const participantSchema = new Schema<MeetingParticipant>(
  {
    identity: { type: String, required: true },
    userId: { type: String, default: null },
    displayName: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true, default: "member" },
    joinedAt: { type: Date, required: true, default: Date.now },
    leftAt: { type: Date, default: null },
    speakingMs: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const meetingSchema = new Schema<Meeting>(
  {
    roomId: { type: Schema.Types.ObjectId, required: true, index: true },
    livekitRoomSid: { type: String, default: null },
    startedAt: { type: Date, required: true, default: Date.now },
    endedAt: { type: Date, default: null },
    participants: { type: [participantSchema], default: [] },
  },
  { timestamps: true, collection: "meetings" },
);

meetingSchema.index(
  { livekitRoomSid: 1 },
  { unique: true, partialFilterExpression: { livekitRoomSid: { $type: "string" } } },
);
meetingSchema.index({ roomId: 1, startedAt: -1 });
meetingSchema.index({ "participants.userId": 1 });

export const MeetingModel = defineModel("Meeting", meetingSchema);

const admissionRequestSchema = new Schema<AdmissionRequest>(
  {
    roomId: { type: Schema.Types.ObjectId, required: true },
    displayName: { type: String, required: true },
    userId: { type: String, default: null },
    status: {
      type: String,
      enum: ["pending", "admitted", "denied"],
      required: true,
      default: "pending",
    },
    createdAt: { type: Date, required: true, default: Date.now },
    resolvedAt: { type: Date, default: null },
  },
  { collection: "admission_requests" },
);

admissionRequestSchema.index({ roomId: 1, status: 1 });
admissionRequestSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 });

export const AdmissionRequestModel = defineModel("AdmissionRequest", admissionRequestSchema);
