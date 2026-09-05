import { permissionsFor, type Role } from "@us-stream/shared";
import type { VideoGrant } from "livekit-server-sdk";

/**
 * What a role is allowed to do inside a LiveKit room.
 *
 * This is the only place a client's capabilities are decided. Everything the
 * browser sends is a claim; these grants are signed into the access token and
 * enforced by the SFU, so a participant cannot promote themselves by editing
 * anything locally.
 *
 * `roomAdmin` is the dangerous one — it permits muting and removing other
 * people — and only a cohost or owner ever receives it.
 *
 * Kept free of `server-only` and of environment access so it can be unit
 * tested on its own; this mapping is the part most worth a test.
 */
export function grantsFor(role: Role, roomName: string): VideoGrant {
  const permissions = permissionsFor(role);

  return {
    room: roomName,
    roomJoin: true,
    canPublish: permissions.canPublish,
    canSubscribe: permissions.canSubscribe,
    canPublishData: permissions.canPublishData,
    roomAdmin: permissions.canManageParticipants,
    // Letting a participant rewrite their own metadata would let a guest paint
    // a host's badge on themselves in everyone else's interface.
    canUpdateOwnMetadata: false,
  };
}

/** LiveKit room names are namespaced by the room's own id, never its slug. */
export function livekitRoomName(roomId: string): string {
  return `room_${roomId}`;
}
