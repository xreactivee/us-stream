import "server-only";

import { LIVEKIT_TOKEN_TTL_SECONDS, type Role } from "@us-stream/shared";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { env } from "@/env";
import { grantsFor } from "./livekit-grants";

export { grantsFor, livekitRoomName } from "./livekit-grants";

/** The REST endpoint lives on the same host as the signalling WebSocket. */
const httpUrl = env.NEXT_PUBLIC_LIVEKIT_URL.replace(/^ws/, "http");

export const roomService = new RoomServiceClient(
  httpUrl,
  env.LIVEKIT_API_KEY,
  env.LIVEKIT_API_SECRET,
);

export interface ParticipantMetadata {
  role: Role;
  /** Set for signed-in participants; absent for guests. */
  userId?: string;
}

export async function createAccessToken({
  roomName,
  identity,
  displayName,
  role,
  userId,
}: {
  roomName: string;
  identity: string;
  displayName: string;
  role: Role;
  userId?: string;
}): Promise<string> {
  const metadata: ParticipantMetadata = userId ? { role, userId } : { role };

  const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity,
    name: displayName,
    ttl: LIVEKIT_TOKEN_TTL_SECONDS,
    // Set here rather than by the client: the role shown next to someone's
    // name has to be the role the token actually granted.
    metadata: JSON.stringify(metadata),
  });

  token.addGrant(grantsFor(role, roomName));

  return token.toJwt();
}
