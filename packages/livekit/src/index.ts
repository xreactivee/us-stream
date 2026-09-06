/**
 * Server-side LiveKit helpers.
 *
 * Both servers need these: the web app issues the token that admits someone to
 * a call, and the realtime service issues the ones that move people between
 * every room. The grant mapping is the most security-sensitive code in the
 * project, so it lives here once rather than being copied into each.
 *
 * This package holds the API secret's uses and must never be imported from the
 * browser.
 */

import { LIVEKIT_TOKEN_TTL_SECONDS, permissionsFor, type Role } from "@us-stream/shared";
import {
  AccessToken,
  DataPacket_Kind,
  RoomServiceClient,
  type VideoGrant,
} from "livekit-server-sdk";

export interface LiveKitCredentials {
  /** The signalling URL, `ws(s)://…`. */
  url: string;
  apiKey: string;
  apiSecret: string;
}

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

export interface ParticipantMetadata {
  role: Role;
  /** Set for signed-in participants; absent for guests. */
  userId?: string;
}

export async function createAccessToken(
  credentials: LiveKitCredentials,
  {
    roomName,
    identity,
    displayName,
    role,
    userId,
    ttlSeconds = LIVEKIT_TOKEN_TTL_SECONDS,
  }: {
    roomName: string;
    identity: string;
    displayName: string;
    role: Role;
    userId?: string;
    ttlSeconds?: number;
  },
): Promise<string> {
  const metadata: ParticipantMetadata = userId ? { role, userId } : { role };

  const token = new AccessToken(credentials.apiKey, credentials.apiSecret, {
    identity,
    name: displayName,
    ttl: ttlSeconds,
    // Set here rather than by the client: the role shown next to someone's
    // name has to be the role the token actually granted.
    metadata: JSON.stringify(metadata),
  });

  token.addGrant(grantsFor(role, roomName));

  return token.toJwt();
}

export function createRoomService(credentials: LiveKitCredentials): RoomServiceClient {
  // The REST endpoint lives on the same host as the signalling WebSocket.
  return new RoomServiceClient(
    credentials.url.replace(/^ws/, "http"),
    credentials.apiKey,
    credentials.apiSecret,
  );
}

export { roleFromMetadata } from "@us-stream/shared";
export { DataPacket_Kind, type RoomServiceClient, type VideoGrant };
