import { AdmissionRequestModel } from "@us-stream/db";
import {
  DISPLAY_NAME_MIN_LENGTH,
  GUEST_TOKEN_TTL_SECONDS,
  hasAuthority,
  type JoinRoomResponse,
  joinRoomSchema,
  roomSlugSchema,
  sameDisplayName,
} from "@us-stream/shared";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { connectDb } from "@/lib/db";
import { GUEST_COOKIE_NAME, issueGuestToken, verifyGuestToken } from "@/lib/guest";
import { createAccessToken, livekitRoomName, roomService } from "@/lib/livekit";
import { ensureActiveMeeting, recordParticipantJoin } from "@/lib/meetings";
import { verifyRoomPassword } from "@/lib/password";
import { getRoomBySlug, roleForUser } from "@/lib/rooms";
import { getSession } from "@/lib/session";

function reject(reason: Extract<JoinRoomResponse, { status: "rejected" }>["reason"], status = 403) {
  return NextResponse.json<JoinRoomResponse>({ status: "rejected", reason }, { status });
}

/**
 * Issues a LiveKit access token for one room.
 *
 * This is the single gate between the public internet and a call. Everything
 * the browser sends — display name, password, whether it thinks it is a host —
 * is treated as a claim; the role, and therefore the grants, are decided here
 * from the session and the room's own membership.
 */
export async function POST(request: NextRequest, context: RouteContext<"/api/rooms/[slug]/token">) {
  const { slug: rawSlug } = await context.params;
  const slug = roomSlugSchema.safeParse(rawSlug);

  if (!slug.success) {
    return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  }

  const body = joinRoomSchema.safeParse(await request.json().catch(() => ({})));

  if (!body.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  await connectDb();
  const room = await getRoomBySlug(slug.data);

  if (!room) {
    return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  }

  const session = await getSession();
  const role = roleForUser(room, session?.user.id);
  const isHost = hasAuthority(role, "cohost");

  // Hosts are never held at the door: they are the ones who lock the room,
  // set the password and admit everyone else.
  if (!isHost) {
    if (room.isLocked) {
      return reject("room_locked");
    }

    if (room.passwordHash) {
      if (!body.data.password) {
        return reject("password_required", 401);
      }

      if (!(await verifyRoomPassword(body.data.password, room.passwordHash))) {
        return reject("password_incorrect", 401);
      }
    }
  }

  const roomName = livekitRoomName(String(room._id));

  if (room.maxParticipants) {
    const participants = await roomService.listParticipants(roomName).catch(() => []);

    if (participants.length >= room.maxParticipants) {
      return reject("room_full");
    }
  }

  // Identity resolution. A signed-in user is identified by their account; a
  // guest carries a signed identity we issued, so the name and id in the room
  // cannot be edited in the browser.
  let identity: string;
  let displayName: string;
  let userId: string | undefined;
  let freshGuestToken: string | null = null;

  if (session) {
    identity = `user_${session.user.id}`;
    displayName = session.user.name;
    userId = session.user.id;
  } else {
    const requested = body.data.displayName ?? "";
    const existing = verifyGuestToken(request.cookies.get(GUEST_COOKIE_NAME)?.value ?? "");

    /*
     * The same guest keeps the same identity across leaving and coming back.
     *
     * The cookie is what makes that possible, and it is honoured whenever the
     * name has not changed — not only when the browser sends no name at all.
     * The lobby always sends the name it has in its field, so the narrower
     * rule meant a fresh identity on every rejoin, and the meeting record
     * counted one person as several.
     */
    if (existing && (requested === "" || sameDisplayName(existing.displayName, requested))) {
      identity = existing.id;
      displayName = existing.displayName;
    } else {
      if (requested.length < DISPLAY_NAME_MIN_LENGTH) {
        return reject("name_required", 400);
      }

      const issued = issueGuestToken(requested);
      identity = issued.identity.id;
      displayName = issued.identity.displayName;
      freshGuestToken = issued.token;
    }
  }

  if (!isHost && room.waitingRoomEnabled) {
    /*
     * One request per person per room, whatever its state.
     *
     * The filter used to include `status: "pending"`, which meant that the
     * moment a host admitted somebody the filter stopped matching and the
     * upsert opened a second pending request — so being let in put you
     * straight back into the queue and the client waited forever.
     */
    const admission = await AdmissionRequestModel.findOneAndUpdate(
      { roomId: room._id, displayName },
      {
        $setOnInsert: {
          roomId: room._id,
          displayName,
          userId: userId ?? null,
          status: "pending",
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    if (admission.status === "denied") {
      return reject("denied");
    }

    if (admission.status === "pending") {
      const waiting = NextResponse.json<JoinRoomResponse>({
        status: "waiting",
        requestId: String(admission._id),
      });

      return withGuestCookie(waiting, freshGuestToken);
    }
  }

  // Open the meeting here rather than waiting for LiveKit's `room_started`
  // webhook: chat needs something to attach itself to, and the webhook needs a
  // publicly reachable service that a local setup does not have.
  const meeting = await ensureActiveMeeting(room._id);
  await recordParticipantJoin(meeting._id, { identity, userId, displayName, role });

  const token = await createAccessToken({ roomName, identity, displayName, role, userId });

  const response = NextResponse.json<JoinRoomResponse>({
    status: "joined",
    token,
    serverUrl: env.NEXT_PUBLIC_LIVEKIT_URL,
    roomName,
    identity,
    role,
  });

  return withGuestCookie(response, freshGuestToken);
}

/** Keeps a guest's identity stable across reloads within the same session. */
function withGuestCookie(response: NextResponse, token: string | null): NextResponse {
  if (token) {
    response.cookies.set(GUEST_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: GUEST_TOKEN_TTL_SECONDS,
      secure: env.BETTER_AUTH_URL.startsWith("https://"),
    });
  }

  return response;
}
