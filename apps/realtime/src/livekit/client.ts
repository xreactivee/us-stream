import { createRoomService, type LiveKitCredentials } from "@us-stream/livekit";
import { env } from "../env";

export const credentials: LiveKitCredentials = {
  url: env.LIVEKIT_URL,
  apiKey: env.LIVEKIT_API_KEY,
  apiSecret: env.LIVEKIT_API_SECRET,
};

export const roomService = createRoomService(credentials);
