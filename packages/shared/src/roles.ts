import type { Role, RoomPermissions } from "./types";

export const ROLES = ["owner", "cohost", "member", "guest"] as const;

const RANK: Record<Role, number> = {
  owner: 3,
  cohost: 2,
  member: 1,
  guest: 0,
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function hasAuthority(role: Role, minimum: Role): boolean {
  return RANK[role] >= RANK[minimum];
}

export function outranks(actor: Role, target: Role): boolean {
  return RANK[actor] > RANK[target];
}

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

export function permissionsFor(role: Role): RoomPermissions {
  const isHost = hasAuthority(role, "cohost");

  return {
    canPublish: true,
    canShareScreen: true,
    canPublishData: true,
    canSubscribe: true,
    canManageParticipants: isHost,
    canManageRoom: hasAuthority(role, "owner"),
    canManagePolls: isHost,
    canEditDocuments: true,
  };
}
