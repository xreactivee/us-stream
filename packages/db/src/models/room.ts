import { ROLES } from "@us-stream/shared";
import { Schema } from "mongoose";
import type { Room, RoomMember } from "../types";
import { defineModel } from "./define";

const roomMemberSchema = new Schema<RoomMember>(
  {
    userId: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true, default: "member" },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const roomSchema = new Schema<Room>(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    ownerId: { type: String, required: true, index: true },
    isPersistent: { type: Boolean, required: true, default: true },
    passwordHash: { type: String, default: null },
    waitingRoomEnabled: { type: Boolean, required: true, default: false },
    isLocked: { type: Boolean, required: true, default: false },
    e2eeEnabled: { type: Boolean, required: true, default: false },
    maxParticipants: { type: Number, default: null },
    members: { type: [roomMemberSchema], default: [] },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "rooms" },
);

roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
roomSchema.index({ "members.userId": 1 });

export const RoomModel = defineModel("Room", roomSchema);
