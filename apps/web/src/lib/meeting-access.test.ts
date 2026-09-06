import { describe, expect, it } from "vitest";
import { canViewMeeting } from "./meeting-access";

const room = {
  ownerId: "owner-1",
  members: [{ userId: "member-1", role: "member" as const, createdAt: new Date() }],
};

const meeting = {
  participants: [
    {
      identity: "user_guest-1",
      userId: "attendee-1",
      displayName: "Attendee",
      role: "guest" as const,
      joinedAt: new Date(),
      leftAt: null,
      speakingMs: 0,
    },
    {
      identity: "guest_anon",
      userId: null,
      displayName: "Anon",
      role: "guest" as const,
      joinedAt: new Date(),
      leftAt: null,
      speakingMs: 0,
    },
  ],
};

describe("canViewMeeting", () => {
  it("lets the room owner and its members read the record", () => {
    expect(canViewMeeting(meeting, room, "owner-1")).toBe(true);
    expect(canViewMeeting(meeting, room, "member-1")).toBe(true);
  });

  it("lets somebody who was actually in the meeting read it", () => {
    expect(canViewMeeting(meeting, room, "attendee-1")).toBe(true);
  });

  it("refuses everyone else", () => {
    expect(canViewMeeting(meeting, room, "stranger")).toBe(false);
  });

  it("does not treat a signed-out participant as a match", () => {
    expect(canViewMeeting(meeting, room, "")).toBe(false);
  });
});
