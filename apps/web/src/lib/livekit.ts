import "server-only";

import {
  createRoomService,
  createAccessToken as createToken,
  type LiveKitCredentials,
} from "@us-stream/livekit";
import type { Role } from "@us-stream/shared";
import { env } from "@/env";

export { grantsFor, livekitRoomName, roleFromMetadata } from "@us-stream/livekit";

const credentials: LiveKitCredentials = {
  url: env.NEXT_PUBLIC_LIVEKIT_URL,
  apiKey: env.LIVEKIT_API_KEY,
  apiSecret: env.LIVEKIT_API_SECRET,
};

export const roomService = createRoomService(credentials);

export function createAccessToken(options: {
  roomName: string;
  identity: string;
  displayName: string;
  role: Role;
  userId?: string;
}) {
  return createToken(credentials, options);
}
