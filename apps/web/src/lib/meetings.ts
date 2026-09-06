import "server-only";

import { type Meeting, MeetingModel, type Types } from "@us-stream/db";
import { type Role, sameDisplayName } from "@us-stream/shared";
import { connectDb } from "./db";

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
