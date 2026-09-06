import { createEvent } from "ics";

export interface CalendarInvite {
  id: string;
  title: string;
  startsAt: Date;
  durationMinutes: number;
  roomName: string;
  joinUrl: string;
}

/**
 * Builds the `.ics` file a calendar application will accept.
 *
 * The times are given as UTC components rather than local ones. `ics` reads a
 * bare array as wall-clock time in whatever zone the *server* happens to be in,
 * which would silently shift every invite for anyone whose deployment moved
 * region.
 */
export function buildInvite(invite: CalendarInvite): string | null {
  const start = invite.startsAt;

  const { error, value } = createEvent({
    uid: `${invite.id}@us-stream`,
    title: invite.title,
    description: `${invite.roomName}\n${invite.joinUrl}`,
    location: invite.joinUrl,
    url: invite.joinUrl,
    startInputType: "utc",
    startOutputType: "utc",
    start: [
      start.getUTCFullYear(),
      start.getUTCMonth() + 1,
      start.getUTCDate(),
      start.getUTCHours(),
      start.getUTCMinutes(),
    ],
    duration: { minutes: invite.durationMinutes },
    productId: "us-stream",
  });

  return error ? null : (value ?? null);
}
