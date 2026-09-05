import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { DISPLAY_NAME_MAX_LENGTH, GUEST_TOKEN_TTL_SECONDS } from "@us-stream/shared";
import { env } from "@/env";

/**
 * Identity for someone who joins by link without an account.
 *
 * The point is not to authenticate anyone — it is that the name and id a guest
 * carries into a room were issued by us and cannot be edited in the browser.
 * Without that, a guest could rename themselves to a host's display name, or
 * reuse another participant's identity to impersonate them over the data
 * channel.
 */
export interface GuestIdentity {
  id: string;
  displayName: string;
  /** Unix seconds. */
  expiresAt: number;
}

/** Holds the signed identity so a reload does not create a new participant. */
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

/** Returns `null` for anything tampered with, malformed or expired. */
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
