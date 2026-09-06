import { ROLES } from "@us-stream/shared";
import { describe, expect, it } from "vitest";
import { grantsFor, livekitRoomName } from "./index";

const ROOM = "room_abc123";

describe("grantsFor", () => {
  it("gives roomAdmin only to owners and cohosts", () => {
    expect(grantsFor("owner", ROOM).roomAdmin).toBe(true);
    expect(grantsFor("cohost", ROOM).roomAdmin).toBe(true);

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
    expect(livekitRoomName("64f0c0ffee")).toBe("room_64f0c0ffee");
  });
});
