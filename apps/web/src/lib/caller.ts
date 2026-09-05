import "server-only";

import type { Room } from "@us-stream/db";
import { hasAuthority, type Role } from "@us-stream/shared";
import type { NextRequest } from "next/server";
import { GUEST_COOKIE_NAME, verifyGuestToken } from "./guest";
import { roleForUser } from "./rooms";
import { getSession } from "./session";

export interface Caller {
  identity: string;
  displayName: string;
  role: Role;
  isHost: boolean;
}

/**
 * Who is making an in-room request.
 *
 * The identity and display name come from the session or from the signed guest
 * cookie, never from the request body — otherwise anyone able to post could
 * post as anyone. Guests only ever hold that cookie because the token endpoint
 * issued it after they cleared the room's password and waiting room.
 */
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
