import type { Role } from "@us-stream/shared";

export interface LiveKitCredentials {
  url: string;
  apiKey: string;
  apiSecret: string;
}

export interface ParticipantMetadata {
  role: Role;
  userId?: string;
}

export interface AccessTokenOptions {
  roomName: string;
  identity: string;
  displayName: string;
  role: Role;
  userId?: string;
  ttlSeconds?: number;
}
