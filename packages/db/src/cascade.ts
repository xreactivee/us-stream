import type { Types } from "mongoose";
import { trusted } from "mongoose";
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
