import { MeetingModel, trusted } from "@us-stream/db";
import { livekitRoomName } from "@us-stream/livekit";
import { roomService } from "../livekit/client";

/**
 * Closes meetings whose LiveKit room is gone.
 *
 * `meeting.endedAt` is otherwise written only by the `room_finished` webhook,
 * and a webhook needs this service to be reachable from the internet. Until it
 * is deployed — and any time LiveKit cannot reach it — every meeting would stay
 * open forever, and a meeting that never ends has no history.
 *
 * Asking LiveKit which rooms exist is the authoritative answer either way: the
 * SFU is the only thing that really knows. The webhook is faster when it
 * arrives; this catches the rest. Both converge on the same rule, so whichever
 * runs first wins and the other finds nothing to do.
 */
/**
 * Which of the open meetings no longer have a room.
 *
 * Separated from the query so the rule can be tested without a database or a
 * LiveKit project — getting it backwards would close meetings that are still
 * running, which is the one failure that would be noticed by everyone at once.
 */
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
        // Anyone still marked present left when the room did. Without this a
        // participant list shows people who never appear to have gone.
        "participants.$[present].leftAt": endedAt,
      },
    },
    { arrayFilters: [{ "present.leftAt": null }] },
  );

  return finished.length;
}
