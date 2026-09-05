import { isRole, type Role } from "@us-stream/shared";

/**
 * Reads the role out of a participant's LiveKit metadata.
 *
 * The metadata is written by the token endpoint and participants cannot change
 * their own, so it is trustworthy — but it still arrives as a string over the
 * network, so anything unrecognised falls back to the least privileged role
 * rather than being believed.
 */
export function participantRole(metadata: string | undefined): Role {
  if (!metadata) {
    return "guest";
  }

  try {
    const parsed = JSON.parse(metadata) as { role?: unknown };
    return isRole(parsed.role) ? parsed.role : "guest";
  } catch {
    return "guest";
  }
}

export const ROLE_LABEL_KEYS = {
  owner: "roleOwner",
  cohost: "roleCohost",
  member: "roleMember",
  guest: "roleGuest",
} as const satisfies Record<Role, string>;
