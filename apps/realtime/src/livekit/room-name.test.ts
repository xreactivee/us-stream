import { describe, expect, it } from "vitest";
import { roomIdFromName } from "./room-name";

const VALID_ID = "64f0c0ffee1234567890abcd";

describe("roomIdFromName", () => {
  it("extracts the room id from a name we issued", () => {
    expect(roomIdFromName(`room_${VALID_ID}`)?.toString()).toBe(VALID_ID);
  });

  it("ignores names that are not ours", () => {
    // Breakout sub-rooms and anything created outside the app land here.
    expect(roomIdFromName("room_64f0c0ffee1234567890abcd--breakout-2")).toBeNull();
    expect(roomIdFromName("some-other-room")).toBeNull();
    expect(roomIdFromName("room_")).toBeNull();
    expect(roomIdFromName("room_not-an-object-id")).toBeNull();
    expect(roomIdFromName(undefined)).toBeNull();
    expect(roomIdFromName("")).toBeNull();
  });

  it("does not accept a prefix that merely starts the same way", () => {
    expect(roomIdFromName(`roomx_${VALID_ID}`)).toBeNull();
  });
});
