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
 *
 * Every query operator here is wrapped in `trusted()`. `sanitizeFilter` is on
 * globally so that a `$`-prefixed key arriving in a request body cannot widen
 * a query; the cost is that it cannot tell our own deliberate `$in` from an
 * injected one, and wraps both. `trusted()` is how Mongoose lets a caller say
 * this operator came from the code, not from a user.
 */

import type { Types } from "mongoose";
import { trusted } from "mongoose";
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

  const filter = { meetingId: trusted({ $in: meetingIds }) };

  await Promise.all([
    MessageModel.deleteMany(filter),
    PollModel.deleteMany(filter),
    QuestionModel.deleteMany(filter),
    BreakoutRoomModel.deleteMany(filter),
  ]);

  await MeetingModel.deleteMany({ _id: trusted({ $in: meetingIds }) });
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
  const rooms = await RoomModel.find().select("_id").lean();
  const liveRoomIds = rooms.map((room) => room._id);

  const orphanedMeetings = await MeetingModel.find({
    roomId: trusted({ $nin: liveRoomIds }),
  })
    .select("_id")
    .lean();
  const orphanedMeetingIds = orphanedMeetings.map((meeting) => meeting._id);

  await deleteMeetingsAndChildren(orphanedMeetingIds);

  const orphanFilter = { roomId: trusted({ $nin: liveRoomIds }) };

  const results = await Promise.all([
    DocModel.deleteMany(orphanFilter),
    AdmissionRequestModel.deleteMany(orphanFilter),
    ScheduledMeetingModel.deleteMany(orphanFilter),
  ]);

  return {
    meetings: orphanedMeetingIds.length,
    children: results.reduce((total, result) => total + result.deletedCount, 0),
  };
}
