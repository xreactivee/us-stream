import { describe, expect, it } from "vitest";
import { ROOM_SLUG_MAX_LENGTH, ROOM_SLUG_PATTERN } from "./constants";
import { generateRoomSlug } from "./slug";

describe("generateRoomSlug", () => {
  it("always produces a slug the router and validator accept", () => {
    for (let i = 0; i < 500; i += 1) {
      const slug = generateRoomSlug("tr");
      expect(ROOM_SLUG_PATTERN.test(slug), slug).toBe(true);
      expect(slug.length).toBeLessThanOrEqual(ROOM_SLUG_MAX_LENGTH);
    }
  });

  it("uses the caller's language", () => {
    const turkish = Array.from({ length: 60 }, () => generateRoomSlug("tr")).join(" ");
    const english = Array.from({ length: 60 }, () => generateRoomSlug("en")).join(" ");

    expect(turkish).toMatch(/kedi|deniz|kitap|mavi|yesil/);
    expect(english).toMatch(/cat|ocean|book|blue|green/);
  });

  it("contains no characters that need escaping in a URL", () => {
    for (let i = 0; i < 200; i += 1) {
      const slug = generateRoomSlug("en");
      expect(encodeURIComponent(slug)).toBe(slug);
    }
  });
});

describe("ROOM_SLUG_PATTERN", () => {
  it("rejects paths, uppercase and empty segments", () => {
    expect(ROOM_SLUG_PATTERN.test("blue-cat-4821")).toBe(true);
    expect(ROOM_SLUG_PATTERN.test("Blue-Cat-4821")).toBe(false);
    expect(ROOM_SLUG_PATTERN.test("blue--cat")).toBe(false);
    expect(ROOM_SLUG_PATTERN.test("blue/cat")).toBe(false);
    expect(ROOM_SLUG_PATTERN.test("../secrets")).toBe(false);
    expect(ROOM_SLUG_PATTERN.test("single")).toBe(false);
  });
});
