import type { Role } from "@us-stream/shared";

export { roleFromMetadata as participantRole } from "@us-stream/shared";

export const ROLE_LABEL_KEYS = {
  owner: "roleOwner",
  cohost: "roleCohost",
  member: "roleMember",
  guest: "roleGuest",
} as const satisfies Record<Role, string>;
