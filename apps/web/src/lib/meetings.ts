import "server-only";

import { type Meeting, MeetingModel, type Types } from "@us-stream/db";
import type { Role } from "@us-stream/shared";
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
 */
export async function recordParticipantJoin(
  meetingId: Types.ObjectId,
  participant: { identity: string; userId?: string | null; displayName: string; role: Role },
): Promise<void> {
  await connectDb();

  const updated = await MeetingModel.updateOne(
    { _id: meetingId, "participants.identity": participant.identity },
    { $set: { "participants.$.leftAt": null, "participants.$.role": participant.role } },
  );

  if (updated.matchedCount === 0) {
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
}
