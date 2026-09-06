import "server-only";

import { type Meeting, MeetingModel, type Types } from "@us-stream/db";
import { type Role, sameDisplayName } from "@us-stream/shared";
import { connectDb } from "./db";

/**
 * Finds the meeting currently running in a room, opening one if there is none.
 *
 * LiveKit's `room_started` webhook also creates this document, but webhooks
 * need a publicly reachable service and chat has to work without one. Both
 * paths converge on the same rule — one open meeting per room — so whichever
 * arrives first wins and the other updates it.
 */
export async function ensureActiveMeeting(roomId: Types.ObjectId): Promise<Meeting> {
  await connectDb();

  const existing = await MeetingModel.findOne({ roomId, endedAt: null }).lean<Meeting>();

  if (existing) {
    return existing;
  }

  const created = await MeetingModel.create({ roomId, startedAt: new Date() });

  return created.toObject<Meeting>();
}

export async function getActiveMeeting(roomId: Types.ObjectId): Promise<Meeting | null> {
  await connectDb();
  return MeetingModel.findOne({ roomId, endedAt: null }).lean<Meeting>();
}

/**
 * Records someone's arrival, or marks them present again if they are
 * reconnecting. A participant who drops and comes back is the same person in
 * the same meeting, not a second row.
 *
 * Three things can identify the returning person, in descending order of
 * confidence: the LiveKit identity, the account behind it, and — for guests
 * only — the name they typed. The last one is a deliberate compromise. Two
 * different guests who both call themselves "Ali" are merged into one row, and
 * that is preferred to the alternative, where one guest who reloads the page
 * appears three times in the history of a meeting they attended once.
 */
export async function recordParticipantJoin(
  meetingId: Types.ObjectId,
  participant: { identity: string; userId?: string | null; displayName: string; role: Role },
): Promise<void> {
  await connectDb();

  const meeting = await MeetingModel.findById(meetingId).lean<Meeting>();

  if (!meeting) {
    return;
  }

  const existing = meeting.participants.findIndex((candidate) => {
    if (candidate.identity === participant.identity) {
      return true;
    }

    if (participant.userId) {
      return candidate.userId === participant.userId;
    }

    return !candidate.userId && sameDisplayName(candidate.displayName, participant.displayName);
  });

  if (existing >= 0) {
    await MeetingModel.updateOne(
      { _id: meetingId },
      {
        $set: {
          // The identity is rewritten because everything addressed to this
          // participant afterwards — the speaking-time report, above all —
          // carries the identity the room knows them by now.
          [`participants.${existing}.identity`]: participant.identity,
          [`participants.${existing}.displayName`]: participant.displayName,
          [`participants.${existing}.role`]: participant.role,
          [`participants.${existing}.leftAt`]: null,
        },
      },
    );

    return;
  }

  await MeetingModel.updateOne(
    { _id: meetingId },
    {
      $push: {
        participants: {
          identity: participant.identity,
          userId: participant.userId ?? null,
          displayName: participant.displayName,
          role: participant.role,
          joinedAt: new Date(),
          leftAt: null,
          speakingMs: 0,
        },
      },
    },
  );
}
