import { describe, expect, it } from "vitest";
import { hasAuthority, isRole, outranks, permissionsFor, ROLES } from "./roles";

describe("hasAuthority", () => {
  it("orders the roles owner > cohost > member > guest", () => {
    expect(hasAuthority("owner", "cohost")).toBe(true);
    expect(hasAuthority("cohost", "member")).toBe(true);
    expect(hasAuthority("member", "guest")).toBe(true);

    expect(hasAuthority("cohost", "owner")).toBe(false);
    expect(hasAuthority("guest", "member")).toBe(false);
  });

  it("treats a role as meeting its own threshold", () => {
    for (const role of ROLES) {
      expect(hasAuthority(role, role), role).toBe(true);
    }
  });
});

describe("outranks", () => {
  it("requires strictly more authority", () => {
    expect(outranks("owner", "cohost")).toBe(true);
    // Two cohosts cannot remove each other.
    expect(outranks("cohost", "cohost")).toBe(false);
  });
});

describe("permissionsFor", () => {
  it("restricts participant and room management to hosts", () => {
    expect(permissionsFor("owner").canManageParticipants).toBe(true);
    expect(permissionsFor("cohost").canManageParticipants).toBe(true);
    expect(permissionsFor("member").canManageParticipants).toBe(false);
    expect(permissionsFor("guest").canManageParticipants).toBe(false);

    // Renaming a room, setting its password and locking it belong to the
    // person who owns it, not to a cohost running one meeting.
    expect(permissionsFor("owner").canManageRoom).toBe(true);
    expect(permissionsFor("cohost").canManageRoom).toBe(false);
  });

  it("lets everyone take part in the call itself", () => {
    for (const role of ROLES) {
      const permissions = permissionsFor(role);

      expect(permissions.canPublish, role).toBe(true);
      expect(permissions.canShareScreen, role).toBe(true);
      expect(permissions.canEditDocuments, role).toBe(true);
    }
  });
});

describe("isRole", () => {
  it("rejects anything that is not a known role", () => {
    expect(isRole("owner")).toBe(true);
    expect(isRole("admin")).toBe(false);
    expect(isRole(null)).toBe(false);
    expect(isRole(undefined)).toBe(false);
    expect(isRole({ role: "owner" })).toBe(false);
  });
});
