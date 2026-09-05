import { hasAuthority, isRole, moderateRoomSchema, outranks, type Role } from "@us-stream/shared";
import { TrackSource } from "livekit-server-sdk";
import { type NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { livekitRoomName, roomService } from "@/lib/livekit";
import { getRoomBySlug, roleForUser, updateRoom } from "@/lib/rooms";
import { getSession } from "@/lib/session";

/**
 * Host actions: mute someone, mute everyone, remove someone, lock the room.
 *
 * Two checks stand between a request and an effect. The caller must hold at
 * least cohost in this room, and — for anything aimed at a person — must
 * outrank that person. Without the second check two cohosts could remove each
 * other, and a cohost could remove the owner of the room they are guests in.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/rooms/[slug]/moderate">,
) {
  const { slug } = await context.params;
  const body = moderateRoomSchema.safeParse(await request.json().catch(() => null));

  if (!body.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  await connectDb();
  const room = await getRoomBySlug(slug);

  if (!room) {
    return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  }

  const actorRole = roleForUser(room, session.user.id);

  if (!hasAuthority(actorRole, "cohost")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const roomName = livekitRoomName(String(room._id));
  const action = body.data;

  if (action.action === "setLock") {
    // Locking is a change to the room itself, so it belongs to its owner.
    if (!hasAuthority(actorRole, "owner")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    await updateRoom(room._id, { isLocked: action.locked });
    return NextResponse.json({ ok: true });
  }

  if (action.action === "muteAll") {
    const participants = await roomService.listParticipants(roomName);

    await Promise.all(
      participants
        .filter((participant) => outranks(actorRole, roleOf(participant.metadata)))
        .flatMap((participant) =>
          participant.tracks
            .filter((track) => track.source === TrackSource.MICROPHONE && !track.muted)
            .map((track) =>
              roomService.mutePublishedTrack(roomName, participant.identity, track.sid, true),
            ),
        ),
    );

    return NextResponse.json({ ok: true });
  }

  const target = await roomService
    .getParticipant(roomName, action.targetIdentity)
    .catch(() => null);

  if (!target) {
    return NextResponse.json({ error: "participant_not_found" }, { status: 404 });
  }

  if (!outranks(actorRole, roleOf(target.metadata))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (action.action === "remove") {
    await roomService.removeParticipant(roomName, action.targetIdentity);
    return NextResponse.json({ ok: true });
  }

  // Muting is one-way on purpose: a host can switch someone's microphone off,
  // but only that person can switch it back on.
  await Promise.all(
    target.tracks
      .filter((track) => track.source === TrackSource.MICROPHONE && !track.muted)
      .map((track) => roomService.mutePublishedTrack(roomName, target.identity, track.sid, true)),
  );

  return NextResponse.json({ ok: true });
}

/** Participant metadata is set by us at token time; treat it defensively anyway. */
function roleOf(metadata: string | undefined): Role {
  if (!metadata) {
    return "guest";
  }

  try {
    const parsed = JSON.parse(metadata) as { role?: unknown };
    return isRole(parsed.role) ? parsed.role : "guest";
  } catch {
    return "guest";
  }
}
