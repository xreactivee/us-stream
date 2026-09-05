import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("keeps ordinary same-origin paths", () => {
    expect(safeNextPath("/settings")).toBe("/settings");
    expect(safeNextPath("/r/blue-cat-4821")).toBe("/r/blue-cat-4821");
    expect(safeNextPath("/dashboard?tab=rooms")).toBe("/dashboard?tab=rooms");
  });

  it("falls back when nothing usable was given", () => {
    expect(safeNextPath(undefined)).toBe("/dashboard");
    expect(safeNextPath("")).toBe("/dashboard");
  });

  it("refuses anything that would leave the site", () => {
    // Each of these would turn the sign-in page into an open redirect that
    // sends people elsewhere with our name on the link.
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example")).toBe("/dashboard");
    expect(safeNextPath("/path\\..\\elsewhere")).toBe("/dashboard");
    expect(safeNextPath("javascript:alert(1)")).toBe("/dashboard");
  });

  it("uses the first value when the parameter is repeated", () => {
    expect(safeNextPath(["/settings", "https://evil.example"])).toBe("/settings");
    expect(safeNextPath(["https://evil.example", "/settings"])).toBe("/dashboard");
  });
});
