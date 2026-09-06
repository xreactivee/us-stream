import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { DISPLAY_NAME_MAX_LENGTH, GUEST_TOKEN_TTL_SECONDS } from "@us-stream/shared";
import { env } from "@/env";
import type { GuestIdentity } from "@/types";

export type { GuestIdentity };

export const GUEST_COOKIE_NAME = "us-stream-guest";

function sign(payload: string): string {
  return createHmac("sha256", env.GUEST_TOKEN_SECRET).update(payload).digest("base64url");
}

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function issueGuestToken(displayName: string): { token: string; identity: GuestIdentity } {
  const identity: GuestIdentity = {
    id: `guest_${randomUUID()}`,
    displayName: displayName.trim().slice(0, DISPLAY_NAME_MAX_LENGTH),
    expiresAt: Math.floor(Date.now() / 1000) + GUEST_TOKEN_TTL_SECONDS,
  };

  const payload = encode(identity);

  return { token: `${payload}.${sign(payload)}`, identity };
}

export function verifyGuestToken(token: string): GuestIdentity | null {
  const separator = token.lastIndexOf(".");

  if (separator <= 0) {
    return null;
  }

  const payload = token.slice(0, separator);
  const provided = Buffer.from(token.slice(separator + 1), "base64url");
  const expected = Buffer.from(sign(payload), "base64url");

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const identity = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as GuestIdentity;

    if (typeof identity.expiresAt !== "number" || identity.expiresAt < Date.now() / 1000) {
      return null;
    }

    return identity;
  } catch {
    return null;
  }
}
