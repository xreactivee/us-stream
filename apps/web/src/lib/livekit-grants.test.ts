import { ROLES } from "@us-stream/shared";
import { describe, expect, it } from "vitest";
import { grantsFor, livekitRoomName } from "./livekit-grants";

const ROOM = "room_abc123";

describe("grantsFor", () => {
  it("gives roomAdmin only to owners and cohosts", () => {
    expect(grantsFor("owner", ROOM).roomAdmin).toBe(true);
    expect(grantsFor("cohost", ROOM).roomAdmin).toBe(true);

    // The whole point of the role split: a member or a guest must never be
    // able to mute or remove anyone else.
    expect(grantsFor("member", ROOM).roomAdmin).toBe(false);
    expect(grantsFor("guest", ROOM).roomAdmin).toBe(false);
  });

  it("lets every role publish, subscribe and use the data channel", () => {
    for (const role of ROLES) {
      const grant = grantsFor(role, ROOM);

      expect(grant.canPublish, role).toBe(true);
      expect(grant.canSubscribe, role).toBe(true);
      expect(grant.canPublishData, role).toBe(true);
      expect(grant.roomJoin, role).toBe(true);
    }
  });

  it("never lets a participant rewrite their own metadata", () => {
    // Metadata carries the role badge other people see, so it stays
    // server-set for everyone, hosts included.
    for (const role of ROLES) {
      expect(grantsFor(role, ROOM).canUpdateOwnMetadata, role).toBe(false);
    }
  });

  it("scopes the grant to exactly one room", () => {
    expect(grantsFor("owner", ROOM).room).toBe(ROOM);
    expect(grantsFor("owner", "other").room).toBe("other");
  });
});

describe("livekitRoomName", () => {
  it("derives the room name from the id, not the public slug", () => {
    // The slug can be changed and is guessable; the id cannot.
    expect(livekitRoomName("64f0c0ffee")).toBe("room_64f0c0ffee");
  });
});
