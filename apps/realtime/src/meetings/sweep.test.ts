import { describe, expect, it } from "vitest";
import { finishedMeetings } from "./sweep";

const A = "64f0c0ffee1234567890aaaa";
const B = "64f0c0ffee1234567890bbbb";

describe("finishedMeetings", () => {
  it("closes a meeting whose LiveKit room is gone", () => {
    const open = [{ roomId: A }, { roomId: B }];

    expect(finishedMeetings(open, [`room_${A}`])).toEqual([{ roomId: B }]);
  });

  it("leaves running meetings alone", () => {
    // The dangerous direction: closing a live meeting would be noticed by
    // everyone in it at once.
    const open = [{ roomId: A }, { roomId: B }];

    expect(finishedMeetings(open, [`room_${A}`, `room_${B}`])).toEqual([]);
  });

  it("closes everything when LiveKit reports no rooms at all", () => {
    expect(finishedMeetings([{ roomId: A }], [])).toEqual([{ roomId: A }]);
  });

  it("ignores rooms that are not ours", () => {
    // Breakout sub-rooms and anything created outside the app share the SFU.
    expect(finishedMeetings([{ roomId: A }], [`room_${A}--breakout-1`, "something-else"])).toEqual([
      { roomId: A },
    ]);
  });
});
