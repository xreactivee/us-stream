import type { Meeting, Room } from "@us-stream/db";

export function canViewMeeting(
  meeting: Pick<Meeting, "participants">,
  room: Pick<Room, "ownerId" | "members">,
  userId: string,
): boolean {
  return (
    room.ownerId === userId ||
    room.members.some((member) => member.userId === userId) ||
    meeting.participants.some((participant) => participant.userId === userId)
  );
}
