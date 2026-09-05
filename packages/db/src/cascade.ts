/**
 * MongoDB has no foreign keys and therefore no cascading deletes, so the
 * cleanup that Postgres would do with `ON DELETE CASCADE` is written out here.
 * Everything that deletes a room or a meeting must go through these functions.
 *
 * The deletes are not wrapped in a transaction. A transaction would need a
 * replica set, and the failure mode without one is mild: an interrupted delete
 * leaves orphaned children that the next call — or `pruneOrphans` — removes.
 * Nothing reads a child without its parent, so an orphan is invisible rather
 * than wrong.
 */

import type { Types } from "mongoose";
import { BreakoutRoomModel } from "./models/breakout";
import { DocModel } from "./models/doc";
import { PollModel, QuestionModel } from "./models/engagement";
import { AdmissionRequestModel, MeetingModel } from "./models/meeting";
import { MessageModel } from "./models/message";
import { RoomModel } from "./models/room";
import { ScheduledMeetingModel } from "./models/scheduled-meeting";

export async function deleteMeetingsAndChildren(meetingIds: Types.ObjectId[]): Promise<void> {
  if (meetingIds.length === 0) {
    return;
  }

  const filter = { meetingId: { $in: meetingIds } };

  await Promise.all([
    MessageModel.deleteMany(filter),
    PollModel.deleteMany(filter),
    QuestionModel.deleteMany(filter),
    BreakoutRoomModel.deleteMany(filter),
  ]);

  await MeetingModel.deleteMany({ _id: { $in: meetingIds } });
}

export async function deleteRoomAndChildren(roomId: Types.ObjectId): Promise<void> {
  const meetings = await MeetingModel.find({ roomId }).select("_id").lean();
  await deleteMeetingsAndChildren(meetings.map((meeting) => meeting._id));

  await Promise.all([
    DocModel.deleteMany({ roomId }),
    AdmissionRequestModel.deleteMany({ roomId }),
    ScheduledMeetingModel.deleteMany({ roomId }),
  ]);

  await RoomModel.deleteOne({ _id: roomId });
}

/**
 * Removes children whose parent is gone — the residue of an interrupted delete
 * or of a room removed by its TTL index, which fires without running any of
 * the code above.
 */
export async function pruneOrphans(): Promise<{ meetings: number; children: number }> {
  const roomIds = await RoomModel.find().select("_id").lean();
  const liveRoomIds = roomIds.map((room) => room._id);

  const orphanedMeetings = await MeetingModel.find({ roomId: { $nin: liveRoomIds } })
    .select("_id")
    .lean();
  const orphanedMeetingIds = orphanedMeetings.map((meeting) => meeting._id);

  await deleteMeetingsAndChildren(orphanedMeetingIds);

  const results = await Promise.all([
    DocModel.deleteMany({ roomId: { $nin: liveRoomIds } }),
    AdmissionRequestModel.deleteMany({ roomId: { $nin: liveRoomIds } }),
    ScheduledMeetingModel.deleteMany({ roomId: { $nin: liveRoomIds } }),
  ]);

  return {
    meetings: orphanedMeetingIds.length,
    children: results.reduce((total, result) => total + result.deletedCount, 0),
  };
}
