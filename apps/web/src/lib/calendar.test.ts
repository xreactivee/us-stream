import { describe, expect, it } from "vitest";
import { buildInvite } from "./calendar";

const invite = {
  id: "6a9c880aff9658d191400b10",
  title: "Weekly review",

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
    expect(ics).toContain("DTSTART:20260915T143000Z");
  });

  it("keeps the duration rather than an end time computed elsewhere", () => {
    expect(ics).toContain("DURATION:PT45M");
  });

  it("carries the invite link so the event is actually joinable", () => {
    expect(ics).toContain("us-stream.example/r/blue-cat-4821");
  });

  it("gives the event a stable identifier", () => {
    expect(ics).toContain(`UID:${invite.id}@us-stream`);
  });
});
