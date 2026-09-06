import "server-only";

import {
  bytesOf,
  DocModel,
  isValidObjectId,
  type Meeting,
  MeetingModel,
  MessageModel,
  type Room,
  RoomModel,
  Types,
  trusted,
} from "@us-stream/db";
import { type BoardShape, type DocKind, isBoardShape } from "@us-stream/shared";
import * as Y from "yjs";
import type { MeetingDetail, MeetingSummary } from "@/types";
import { connectDb } from "./db";

export type { MeetingDetail, MeetingSummary };

export async function listMeetingsForUser(userId: string): Promise<MeetingSummary[]> {
  await connectDb();

  const rooms = await RoomModel.find({
    $or: [{ ownerId: userId }, { "members.userId": userId }],
  })
    .select("_id name slug")
    .lean();

  if (rooms.length === 0) {
    return [];
  }

  const byId = new Map(rooms.map((room) => [room._id.toString(), room]));

  const meetings = await MeetingModel.find({
    roomId: trusted({ $in: rooms.map((room) => room._id) }),
    endedAt: trusted({ $ne: null }),
  })
    .sort({ startedAt: -1 })
    .limit(100)
    .lean();

  return meetings.flatMap((meeting) => {
    const room = byId.get(meeting.roomId.toString());

    return room
      ? [
          {
            id: String(meeting._id),
            roomName: room.name,
            roomSlug: room.slug,
            startedAt: meeting.startedAt.getTime(),
            endedAt: meeting.endedAt ? meeting.endedAt.getTime() : null,
            participantCount: meeting.participants.length,
          },
        ]
      : [];
  });
}

export async function getMeetingDetail(meetingId: string): Promise<MeetingDetail | null> {
  if (!isValidObjectId(meetingId)) {
    return null;
  }

  await connectDb();

  const meeting = await MeetingModel.findById(meetingId).lean<Meeting>();

  if (!meeting) {
    return null;
  }

  const room = await RoomModel.findById(meeting.roomId).lean<Room>();

  if (!room) {
    return null;
  }

  const [messages, board, notes] = await Promise.all([
    MessageModel.find({ meetingId: new Types.ObjectId(meetingId) })
      .sort({ createdAt: 1 })
      .limit(1000)
      .lean(),
    readBoard(meeting.roomId),
    readNotes(meeting.roomId),
  ]);

  return {
    meeting,
    room,
    messages: messages.map((message) => ({
      id: String(message._id),
      senderName: message.senderName,
      body: message.body,
      kind: message.kind,
      createdAt: message.createdAt.getTime(),
    })),
    board,
    notes,
  };
}

async function readDoc(roomId: Types.ObjectId, kind: DocKind): Promise<Y.Doc | null> {
  const stored = await DocModel.findOne({ roomId, kind }).lean();
  const bytes = stored ? bytesOf(stored.state) : new Uint8Array();

  if (bytes.byteLength === 0) {
    return null;
  }

  const doc = new Y.Doc();
  Y.applyUpdate(doc, bytes);

  return doc;
}

async function readBoard(roomId: Types.ObjectId): Promise<BoardShape[]> {
  const doc = await readDoc(roomId, "whiteboard");

  if (!doc) {
    return [];
  }

  const shapes: BoardShape[] = [];

  for (const value of doc.getMap("whiteboard.shapes").values()) {
    if (isBoardShape(value)) {
      shapes.push(value);
    }
  }

  doc.destroy();

  return shapes.sort((a, b) => a.createdAt - b.createdAt);
}

async function readNotes(roomId: Types.ObjectId): Promise<string> {
  const doc = await readDoc(roomId, "notes");

  if (!doc) {
    return "";
  }

  const text = doc.getXmlFragment("notes").toString();
  doc.destroy();

  return text;
}

export { canViewMeeting } from "./meeting-access";
