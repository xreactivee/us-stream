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
      const waiting = NextResponse.json<JoinRoomResponse>(
        {
          status: "waiting",
          requestId: String(admission._id),
        },
        { status: 201 },
      );

      return withGuestCookie(waiting, freshGuestToken);
    }
  }

  const meeting = await ensureActiveMeeting(room._id);
  await recordParticipantJoin(meeting._id, { identity, userId, displayName, role });

  const token = await createAccessToken({ roomName, identity, displayName, role, userId });

  const response = NextResponse.json<JoinRoomResponse>(
    {
      status: "joined",
      token,
      serverUrl: env.NEXT_PUBLIC_LIVEKIT_URL,
      roomName,
      identity,
      role,
    },
    { status: 201 },
  );

  return withGuestCookie(response, freshGuestToken);
}

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
