import { describe, expect, it } from "vitest";
import { sameDisplayName } from "./names";

describe("sameDisplayName", () => {
  it("ignores surrounding and repeated whitespace", () => {
    expect(sameDisplayName("  Ada  Lovelace ", "Ada Lovelace")).toBe(true);
  });

  it("ignores case", () => {
    expect(sameDisplayName("ADA", "ada")).toBe(true);
  });

  it("folds Turkish dotted and dotless I the way a Turkish reader would", () => {
    expect(sameDisplayName("İLKE", "ilke")).toBe(true);
    expect(sameDisplayName("IRMAK", "ırmak")).toBe(true);
  });

  it("keeps different names apart", () => {
    expect(sameDisplayName("Ada", "Adam")).toBe(false);

    expect(sameDisplayName("ılke", "ilke")).toBe(false);
  });
});
