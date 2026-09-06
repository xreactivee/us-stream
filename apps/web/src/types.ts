import type { Meeting, Room } from "@us-stream/db";
import type { BoardShape, ReactionEmoji, Role } from "@us-stream/shared";
import type { NextResponse } from "next/server";

export type ActionResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

export interface Caller {
  identity: string;
  displayName: string;
  role: Role;
  isHost: boolean;
}

export type GateResult =
  | { ok: true; room: Room; caller: Caller }
  | { ok: false; response: NextResponse };

export interface GuestIdentity {
  id: string;
  displayName: string;
  expiresAt: number;
}

export interface CalendarInvite {
  id: string;
  title: string;
  startsAt: Date;
  durationMinutes: number;
  roomName: string;
  joinUrl: string;
}

export interface MeetingSummary {
  id: string;
  roomName: string;
  roomSlug: string;
  startedAt: number;
  endedAt: number | null;
  participantCount: number;
}

export interface MeetingDetail {
  meeting: Meeting;
  room: Room;
  messages: {
    id: string;
    senderName: string;
    body: string;
    kind: "text" | "system";
    createdAt: number;
  }[];
  board: BoardShape[];
  notes: string;
}

export interface PendingAdmission {
  id: string;
  displayName: string;
  requestedAt: number;
  isSignedIn: boolean;
}

export interface PollView {
  id: string;
  question: string;
  options: { index: number; label: string; votes: number }[];
  totalVoters: number;
  allowMultiple: boolean;
  isClosed: boolean;
  myVotes: number[];
}

export interface QuestionView {
  id: string;
  body: string;
  askedByName: string;
  upvotes: number;
  hasUpvoted: boolean;
  isAnswered: boolean;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  senderIdentity: string;
  senderName: string;
  body: string;
  toIdentity: string | null;
  sentAt: number;
}

export interface FloatingReaction {
  id: string;
  emoji: ReactionEmoji;
  senderName: string;
}
