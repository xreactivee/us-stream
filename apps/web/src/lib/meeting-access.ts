import type { Meeting, Room } from "@us-stream/db";

/**
 * Whether this person may read a meeting's record.
 *
 * A record names who was in a conversation and repeats what was said in it, so
 * holding the link is not enough: the reader has to belong to the room, or to
 * have been in that meeting themselves.
 *
 * Kept free of any database import so the rule can be tested on its own — it is
 * the kind of check where a mistake is a disclosure rather than a nuisance.
 */
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
