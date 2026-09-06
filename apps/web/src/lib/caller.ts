import "server-only";

import type { Room } from "@us-stream/db";
import { hasAuthority } from "@us-stream/shared";
import type { NextRequest } from "next/server";
import type { Caller } from "@/types";
import { GUEST_COOKIE_NAME, verifyGuestToken } from "./guest";
import { roleForUser } from "./rooms";
import { getSession } from "./session";

export type { Caller };

export async function resolveCaller(
  request: NextRequest,
  room: Pick<Room, "ownerId" | "members">,
): Promise<Caller | null> {
  const session = await getSession();

  if (session) {
    const role = roleForUser(room, session.user.id);

    return {
      identity: `user_${session.user.id}`,
      displayName: session.user.name,
      role,
      isHost: hasAuthority(role, "cohost"),
    };
  }

  const guest = verifyGuestToken(request.cookies.get(GUEST_COOKIE_NAME)?.value ?? "");

  return guest
    ? { identity: guest.id, displayName: guest.displayName, role: "guest", isHost: false }
    : null;
}
