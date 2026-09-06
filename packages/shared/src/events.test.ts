import { describe, expect, it } from "vitest";
import { decodeEvent, encodeEvent, topicFor } from "./events";

const encoder = new TextEncoder();

function payload(value: unknown): Uint8Array {
  return encoder.encode(JSON.stringify(value));
}

describe("decodeEvent", () => {
  it("round-trips a valid event", () => {
    const event = {
      type: "chat.message",
      id: "1e2a1b3c-4d5e-4f60-8a1b-2c3d4e5f6071",
      body: "hello",
      sentAt: 1_700_000_000_000,
    } as const;

    expect(decodeEvent(encodeEvent(event))).toEqual(event);
  });

  it("returns null instead of throwing on anything malformed", () => {
    expect(decodeEvent(encoder.encode("not json"))).toBeNull();
    expect(decodeEvent(payload({ type: "chat.message" }))).toBeNull();
    expect(decodeEvent(payload({ type: "nonsense" }))).toBeNull();
    expect(decodeEvent(payload(null))).toBeNull();
    expect(decodeEvent(new Uint8Array([0xff, 0xfe]))).toBeNull();
  });

  it("rejects a chat message longer than the limit", () => {
    expect(
      decodeEvent(
        payload({
          type: "chat.message",
          id: "1e2a1b3c-4d5e-4f60-8a1b-2c3d4e5f6071",
          body: "x".repeat(2001),
          sentAt: 1_700_000_000_000,
        }),
      ),
    ).toBeNull();
  });

  it("rejects a reaction that is not one of the allowed emoji", () => {
    expect(decodeEvent(payload({ type: "presence.reaction", emoji: "🔥", sentAt: 1 }))).toBeNull();
  });
});

describe("topicFor", () => {
  it("derives the topic from the event type's prefix", () => {
    expect(topicFor({ type: "chat.typing", isTyping: true })).toBe("chat");
    expect(topicFor({ type: "presence.hand", raised: true })).toBe("presence");
    expect(topicFor({ type: "host.spotlight", targetIdentity: null })).toBe("host");
  });
});
