/**
 * Every permission decision in the product — LiveKit grants, API guards and UI
 * affordances — is derived from this one hierarchy, so a role only ever has to
 * be defined in a single place.
 */

export const ROLES = ["owner", "cohost", "member", "guest"] as const;

export type Role = (typeof ROLES)[number];

/** Higher rank means more authority. Used for comparisons, never persisted. */
const RANK: Record<Role, number> = {
  owner: 3,
  cohost: 2,
  member: 1,
  guest: 0,
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** True when `role` has at least the authority of `minimum`. */
export function hasAuthority(role: Role, minimum: Role): boolean {
  return RANK[role] >= RANK[minimum];
}

/** True when `actor` may act upon `target` — an owner outranks a cohost, and so on. */
export function outranks(actor: Role, target: Role): boolean {
  return RANK[actor] > RANK[target];
}

/**
 * Reads the role out of a LiveKit participant's metadata.
 *
 * The metadata is written by the token endpoint and participants cannot change
 * their own, so it is trustworthy — but it still arrives as a string over the
 * network, so anything unrecognised falls back to the least privileged role
 * rather than being believed. Used on both the server and the client, hence
 * living here rather than in either.
 */
export function roleFromMetadata(metadata: string | undefined | null): Role {
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

export interface RoomPermissions {
  /** Publish camera and microphone tracks. */
  canPublish: boolean;
  /** Publish a screen share track. */
  canShareScreen: boolean;
  /** Send data-channel messages: chat, reactions, raised hands. */
  canPublishData: boolean;
  /** Receive other participants' tracks. */
  canSubscribe: boolean;
  /** Mute, remove and promote other participants; admit from the waiting room. */
  canManageParticipants: boolean;
  /** Rename the room, set a password, lock it, toggle the waiting room. */
  canManageRoom: boolean;
  /** Open, assign and recall breakout rooms. */
  canManageBreakouts: boolean;
  /** Create and close polls, mark Q&A questions answered. */
  canManagePolls: boolean;
  /** Draw on the whiteboard and edit the shared notes. */
  canEditDocuments: boolean;
}

export function permissionsFor(role: Role): RoomPermissions {
  const isHost = hasAuthority(role, "cohost");

  return {
    canPublish: true,
    canShareScreen: true,
    canPublishData: true,
    canSubscribe: true,
    canManageParticipants: isHost,
    canManageRoom: hasAuthority(role, "owner"),
    canManageBreakouts: isHost,
    canManagePolls: isHost,
    canEditDocuments: true,
  };
}
