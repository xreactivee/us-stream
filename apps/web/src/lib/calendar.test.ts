import { describe, expect, it } from "vitest";
import { buildInvite } from "./calendar";

const invite = {
  id: "6a9c880aff9658d191400b10",
  title: "Weekly review",
  // 14:30 UTC, deliberately in the afternoon so a timezone slip is visible.
  startsAt: new Date("2026-09-15T14:30:00.000Z"),
  durationMinutes: 45,
  roomName: "Monday stand-up",
  joinUrl: "https://us-stream.example/r/blue-cat-4821",
};

describe("buildInvite", () => {
  const ics = buildInvite(invite) ?? "";

  it("produces a single calendar event", () => {
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("writes the start in UTC, not in the server's timezone", () => {
    // The whole reason the builder passes UTC components explicitly: reading
    // them as local time would move every invite by whatever the deployment
    // region happens to be.
    expect(ics).toContain("DTSTART:20260915T143000Z");
  });

  it("keeps the duration rather than an end time computed elsewhere", () => {
    expect(ics).toContain("DURATION:PT45M");
  });

  it("carries the invite link so the event is actually joinable", () => {
    expect(ics).toContain("us-stream.example/r/blue-cat-4821");
  });

  it("gives the event a stable identifier", () => {
    // A calendar updates an existing entry rather than duplicating it when the
    // uid matches, which is what makes rescheduling work later.
    expect(ics).toContain(`UID:${invite.id}@us-stream`);
  });
});
