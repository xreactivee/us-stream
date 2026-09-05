import { BreakoutRoomModel, type Meeting, MeetingModel, type Types, trusted } from "@us-stream/db";
import {
  breakoutRoomName,
  createAccessToken,
  DataPacket_Kind,
  livekitRoomName,
} from "@us-stream/livekit";
import {
  BREAKOUT_MAX_ROOMS,
  BREAKOUT_MIN_ROOMS,
  type DataChannelEvent,
  encodeEvent,
  type Role,
  topicFor,
} from "@us-stream/shared";
import { credentials, roomService } from "../livekit/client";

/**
 * Breakout rooms.
 *
 * All of it runs here rather than in the web app for one reason: moving
 * somebody means minting them a token for another room and telling them to go,
 * and both halves need the API secret. Doing it server-side also means the
 * host's browser never handles other people's tokens, and a participant whose
 * timer expires is recalled even if the host has closed their laptop.
 */

/** Tokens for a sub-room are short-lived; the client reconnects immediately. */
const MOVE_TOKEN_TTL_SECONDS = 60 * 60 * 4;

async function send(roomName: string, event: DataChannelEvent, identities?: string[]) {
  await roomService.sendData(roomName, encodeEvent(event), DataPacket_Kind.RELIABLE, {
    destinationIdentities: identities,
    topic: topicFor(event),
  });
}

function participantRole(meeting: Meeting, identity: string): Role {
  return meeting.participants.find((entry) => entry.identity === identity)?.role ?? "guest";
}

function displayNameOf(meeting: Meeting, identity: string): string {
  return meeting.participants.find((entry) => entry.identity === identity)?.displayName ?? identity;
}

export interface OpenBreakoutsInput {
  roomId: Types.ObjectId;
  count: number;
  durationMinutes: number | null;
  /** Identities that stay in the main room — normally just the host. */
  keepIdentities: string[];
}

export async function openBreakouts({
  roomId,
  count,
  durationMinutes,
  keepIdentities,
}: OpenBreakoutsInput): Promise<{ opened: number; moved: number }> {
  const rooms = Math.min(Math.max(count, BREAKOUT_MIN_ROOMS), BREAKOUT_MAX_ROOMS);
  const meeting = await MeetingModel.findOne({ roomId, endedAt: null }).lean<Meeting>();

  if (!meeting) {
    throw new Error("no_active_meeting");
  }

  // Anyone still present and not held back gets a place. Round-robin keeps the
  // groups even without asking the host to sort people by hand.
  const movable = meeting.participants
    .filter((entry) => entry.leftAt === null && !keepIdentities.includes(entry.identity))
    .map((entry) => entry.identity);

  const parentName = livekitRoomName(roomId.toString());
  const closesAt = durationMinutes ? new Date(Date.now() + durationMinutes * 60_000) : null;

  const created = await Promise.all(
    Array.from({ length: rooms }, (_, index) => {
      const assignments = movable.filter((_identity, position) => position % rooms === index);

      return BreakoutRoomModel.create({
        meetingId: meeting._id,
        name: `${index + 1}`,
        livekitRoomName: breakoutRoomName(parentName, index + 1),
        assignments,
        closesAt,
      });
    }),
  );

  let moved = 0;

  for (const breakout of created) {
    for (const identity of breakout.assignments) {
      const token = await createAccessToken(credentials, {
        roomName: breakout.livekitRoomName,
        identity,
        displayName: displayNameOf(meeting, identity),
        role: participantRole(meeting, identity),
        ttlSeconds: MOVE_TOKEN_TTL_SECONDS,
      });

      // Addressed to one person: everyone gets their own room and their own
      // token, and nobody sees anyone else's.
      await send(
        parentName,
        {
          type: "breakout.move",
          roomName: breakout.livekitRoomName,
          token,
          closesAt: closesAt ? closesAt.getTime() : null,
        },
        [identity],
      );

      moved += 1;
    }
  }

  return { opened: created.length, moved };
}

export async function recallBreakouts(roomId: Types.ObjectId): Promise<{ recalled: number }> {
  const meeting = await MeetingModel.findOne({ roomId, endedAt: null }).lean<Meeting>();

  if (!meeting) {
    return { recalled: 0 };
  }

  const open = await BreakoutRoomModel.find({ meetingId: meeting._id, closedAt: null }).lean();
  const parentName = livekitRoomName(roomId.toString());
  let recalled = 0;

  for (const breakout of open) {
    for (const identity of breakout.assignments) {
      const token = await createAccessToken(credentials, {
        roomName: parentName,
        identity,
        displayName: displayNameOf(meeting, identity),
        role: participantRole(meeting, identity),
        ttlSeconds: MOVE_TOKEN_TTL_SECONDS,
      });

      // Sent into the sub-room, which is where the person actually is.
      await send(
        breakout.livekitRoomName,
        { type: "breakout.recall", roomName: parentName, token },
        [identity],
      ).catch(() => undefined);

      recalled += 1;
    }

    // The room is deleted rather than left empty, so a stale sub-room cannot
    // be rejoined with an old token.
    await roomService.deleteRoom(breakout.livekitRoomName).catch(() => undefined);
  }

  await BreakoutRoomModel.updateMany(
    { _id: trusted({ $in: open.map((breakout) => breakout._id) }) },
    { $set: { closedAt: new Date() } },
  );

  return { recalled };
}

export async function broadcastToBreakouts(
  roomId: Types.ObjectId,
  body: string,
): Promise<{ delivered: number }> {
  const meeting = await MeetingModel.findOne({ roomId, endedAt: null }).lean<Meeting>();

  if (!meeting) {
    return { delivered: 0 };
  }

  const open = await BreakoutRoomModel.find({ meetingId: meeting._id, closedAt: null }).lean();

  await Promise.all(
    open.map((breakout) =>
      send(breakout.livekitRoomName, {
        type: "breakout.broadcast",
        body,
        sentAt: Date.now(),
      }).catch(() => undefined),
    ),
  );

  return { delivered: open.length };
}

/**
 * Pulls everyone back from breakouts whose time is up.
 *
 * This is why the countdown lives on the server: the host who set it may have
 * lost their connection, and the people in the sub-rooms should still come
 * back when they were told they would.
 */
export async function sweepExpiredBreakouts(): Promise<number> {
  const due = await BreakoutRoomModel.find({
    closedAt: null,
    closesAt: trusted({ $ne: null, $lte: new Date() }),
  })
    .select("meetingId")
    .lean();

  if (due.length === 0) {
    return 0;
  }

  const meetingIds = [...new Set(due.map((breakout) => breakout.meetingId.toString()))];
  let recalled = 0;

  for (const meetingId of meetingIds) {
    const meeting = await MeetingModel.findById(meetingId).select("roomId").lean();

    if (meeting) {
      const result = await recallBreakouts(meeting.roomId);
      recalled += result.recalled;
    }
  }

  return recalled;
}
