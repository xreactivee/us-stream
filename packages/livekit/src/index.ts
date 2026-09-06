import { LIVEKIT_TOKEN_TTL_SECONDS, permissionsFor, type Role } from "@us-stream/shared";
import {
  AccessToken,
  DataPacket_Kind,
  RoomServiceClient,
  type VideoGrant,
} from "livekit-server-sdk";
import type { AccessTokenOptions, LiveKitCredentials, ParticipantMetadata } from "./types";

export function grantsFor(role: Role, roomName: string): VideoGrant {
  const permissions = permissionsFor(role);

  return {
    room: roomName,
    roomJoin: true,
    canPublish: permissions.canPublish,
    canSubscribe: permissions.canSubscribe,
    canPublishData: permissions.canPublishData,
    roomAdmin: permissions.canManageParticipants,
    canUpdateOwnMetadata: false,
  };
}

export function livekitRoomName(roomId: string): string {
  return `room_${roomId}`;
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
  }: AccessTokenOptions,
): Promise<string> {
  const metadata: ParticipantMetadata = userId ? { role, userId } : { role };

  const token = new AccessToken(credentials.apiKey, credentials.apiSecret, {
    identity,
    name: displayName,
    ttl: ttlSeconds,
    metadata: JSON.stringify(metadata),
  });

  token.addGrant(grantsFor(role, roomName));

  return token.toJwt();
}

export function createRoomService(credentials: LiveKitCredentials): RoomServiceClient {
  return new RoomServiceClient(
    credentials.url.replace(/^ws/, "http"),
    credentials.apiKey,
    credentials.apiSecret,
  );
}

export { roleFromMetadata } from "@us-stream/shared";
export { DataPacket_Kind, type RoomServiceClient, type VideoGrant };
export * from "./types";
