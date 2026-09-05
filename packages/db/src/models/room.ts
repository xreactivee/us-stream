/**
 * Rooms are the durable thing users own. A room is either persistent — a
 * stable invite link people return to, like a personal meeting room — or
 * disposable, created for one instant meeting and swept afterwards.
 *
 * Membership is embedded rather than kept in its own collection: a room has a
 * handful of standing members at most, and they are always read together with
 * the room itself. People who join by link without an account are not members;
 * their role lives on the meeting's participant entry instead.
 */

import { ROLES, type Role } from "@us-stream/shared";
import { Schema, type Types } from "mongoose";
import { defineModel, type UserId } from "./define";

export interface RoomMember {
  userId: UserId;
  role: Role;
  createdAt: Date;
}

export interface Room {
  _id: Types.ObjectId;
  /** Human-readable invite slug, e.g. `mavi-kedi-4821`. Part of the public URL. */
  slug: string;
  name: string;
  ownerId: UserId;

  isPersistent: boolean;
  /** Argon2 hash. `null` means the room has no password. */
  passwordHash: string | null;
  waitingRoomEnabled: boolean;
  /** A locked room refuses everyone who is not already inside. */
  isLocked: boolean;
  e2eeEnabled: boolean;
  maxParticipants: number | null;

  members: RoomMember[];
  /** Disposable rooms are removed by a TTL index at this instant. */
  expiresAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

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

// Documents whose `expiresAt` is null are never removed, which is exactly the
// behaviour persistent rooms need.
roomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
roomSchema.index({ "members.userId": 1 });

export const RoomModel = defineModel("Room", roomSchema);
