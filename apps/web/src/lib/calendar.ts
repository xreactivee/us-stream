import { createEvent } from "ics";
import type { CalendarInvite } from "@/types";

export type { CalendarInvite };

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
