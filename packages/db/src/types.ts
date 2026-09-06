import type { DocKind, Role } from "@us-stream/shared";
import type { Types } from "mongoose";

export type UserId = string;

export interface RoomMember {
  userId: UserId;
  role: Role;
  createdAt: Date;
}

export interface Room {
  _id: Types.ObjectId;
  slug: string;
  name: string;
  ownerId: UserId;
  isPersistent: boolean;
  passwordHash: string | null;
  waitingRoomEnabled: boolean;
  isLocked: boolean;
  e2eeEnabled: boolean;
  maxParticipants: number | null;
  members: RoomMember[];
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingParticipant {
  identity: string;
  userId: UserId | null;
  displayName: string;
  role: Role;
  joinedAt: Date;
  leftAt: Date | null;
  speakingMs: number;
}

export interface Meeting {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  livekitRoomSid: string | null;
  startedAt: Date;
  endedAt: Date | null;
  participants: MeetingParticipant[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AdmissionRequest {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  displayName: string;
  userId: UserId | null;
  status: "pending" | "admitted" | "denied";
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface CollaborativeDoc {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  kind: DocKind;
  state: Buffer;
  updatedAt: Date;
  createdAt: Date;
}

export interface PollOption {
  index: number;
  label: string;
}

export interface PollVote {
  voterIdentity: string;
  optionIndex: number;
  createdAt: Date;
}

export interface Poll {
  _id: Types.ObjectId;
  meetingId: Types.ObjectId;
  createdByIdentity: string;
  question: string;
  options: PollOption[];
  votes: PollVote[];
  allowMultiple: boolean;
  isAnonymous: boolean;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  _id: Types.ObjectId;
  meetingId: Types.ObjectId;
  askedByIdentity: string;
  askedByName: string;
  body: string;
  upvoters: string[];
  answeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  _id: string;
  meetingId: Types.ObjectId;
  senderIdentity: string;
  senderName: string;
  body: string;
  kind: "text" | "system";
  replyToId: string | null;
  toIdentity: string | null;
  createdAt: Date;
}

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

export interface ConnectOptions {
  uri: string;
  maxPoolSize?: number;
}
