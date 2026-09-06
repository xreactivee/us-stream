import { MeetingModel, trusted } from "@us-stream/db";
import { livekitRoomName } from "@us-stream/livekit";
import { roomService } from "../livekit/client";

export function finishedMeetings<T extends { roomId: { toString(): string } }>(
  open: T[],
  liveRoomNames: Iterable<string>,
): T[] {
  const live = new Set(liveRoomNames);

  return open.filter((meeting) => !live.has(livekitRoomName(meeting.roomId.toString())));
}

export async function sweepFinishedMeetings(): Promise<number> {
  const open = await MeetingModel.find({ endedAt: null }).select("_id roomId").lean();

  if (open.length === 0) {
    return 0;
  }

  const rooms = await roomService.listRooms();
  const finished = finishedMeetings(
    open,
    rooms.map((room) => room.name),
  );

  if (finished.length === 0) {
    return 0;
  }

  const endedAt = new Date();

  await MeetingModel.updateMany(
    { _id: trusted({ $in: finished.map((meeting) => meeting._id) }) },
    {
      $set: {
        endedAt,
        "participants.$[present].leftAt": endedAt,
      },
    },
    { arrayFilters: [{ "present.leftAt": null }] },
  );

  return finished.length;
}
