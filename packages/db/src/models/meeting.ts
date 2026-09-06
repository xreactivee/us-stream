/**
 * A meeting is one occupied session of a room — the span between LiveKit's
 * `room_started` and `room_finished` webhooks. Chat and polls
 * hang off a meeting rather than the room, so a persistent room's history stays
 * separated by occasion.
 *
 * Participants are embedded because their number is bounded by the room's
 * capacity and they are always read alongside the meeting.
 */

import { ROLES, type Role } from "@us-stream/shared";
import { Schema, type Types } from "mongoose";
import { defineModel, type UserId } from "./define";

export interface MeetingParticipant {
  /**
   * The LiveKit identity. Unique within one meeting and stable for its
   * duration; this is what data-channel events address.
   */
  identity: string;
  /** `null` for guests who joined by link without an account. */
  userId: UserId | null;
  displayName: string;
  role: Role;
  joinedAt: Date;
  leftAt: Date | null;
  /** Accumulated speaking time, for the post-meeting talk-time breakdown. */
  speakingMs: number;
}

export interface Meeting {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  /** LiveKit's own room identifier, so webhooks can be matched to a document. */
  livekitRoomSid: string | null;
  startedAt: Date;
  endedAt: Date | null;
  participants: MeetingParticipant[];
  createdAt: Date;
  updatedAt: Date;
}

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

/*
 * A meeting document exists before LiveKit reports its sid, so most rows carry
 * `null` here for a while.
 *
 * This has to be a *partial* index, not a sparse one. Sparse skips documents
 * where the field is missing, but `null` is a present value — so under a sparse
 * unique index the second meeting waiting for its sid collides with the first.
 * The partial filter indexes only rows where a real sid has arrived.
 */
meetingSchema.index(
  { livekitRoomSid: 1 },
  { unique: true, partialFilterExpression: { livekitRoomSid: { $type: "string" } } },
);
meetingSchema.index({ roomId: 1, startedAt: -1 });
meetingSchema.index({ "participants.userId": 1 });

export const MeetingModel = defineModel("Meeting", meetingSchema);

/**
 * Someone held in the waiting room. A host resolves the document by admitting
 * or denying; the waiting client polls its own request until then. Unresolved
 * requests expire on their own so an abandoned lobby does not accumulate.
 */
export interface AdmissionRequest {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  displayName: string;
  userId: UserId | null;
  status: "pending" | "admitted" | "denied";
  createdAt: Date;
  resolvedAt: Date | null;
}

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
