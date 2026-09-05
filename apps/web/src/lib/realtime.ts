import "server-only";

import { env } from "@/env";

/**
 * Calls the realtime service's internal API.
 *
 * The service performs no authorisation of its own — it moves people between
 * rooms on request. The check that the caller is a host of the room happens
 * here, in the app that holds the session, and the shared secret is what makes
 * "the web app said so" believable to the other process.
 */
export async function callRealtime<T>(
  path: string,
  body: unknown,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  // The realtime URL is a WebSocket address; its HTTP API is the same host.
  const base = env.NEXT_PUBLIC_REALTIME_URL.replace(/^ws/, "http");

  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-secret": env.REALTIME_INTERNAL_SECRET,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return { ok: false, status: response?.status ?? 503 };
  }

  return { ok: true, data: (await response.json()) as T };
}
