import { hasAuthority, moderateRoomSchema, outranks, roleFromMetadata } from "@us-stream/shared";
import { TrackSource } from "livekit-server-sdk";
import { type NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { livekitRoomName, roomService } from "@/lib/livekit";
import { getRoomBySlug, roleForUser, updateRoom } from "@/lib/rooms";
import { getSession } from "@/lib/session";

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
    if (!hasAuthority(actorRole, "owner")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    await updateRoom(room._id, { isLocked: action.locked });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (action.action === "muteAll") {
    const participants = await roomService.listParticipants(roomName);

    await Promise.all(
      participants
        .filter((participant) => outranks(actorRole, roleFromMetadata(participant.metadata)))
        .flatMap((participant) =>
          participant.tracks
            .filter((track) => track.source === TrackSource.MICROPHONE && !track.muted)
            .map((track) =>
              roomService.mutePublishedTrack(roomName, participant.identity, track.sid, true),
            ),
        ),
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const target = await roomService
    .getParticipant(roomName, action.targetIdentity)
    .catch(() => null);

  if (!target) {
    return NextResponse.json({ error: "participant_not_found" }, { status: 404 });
  }

  if (!outranks(actorRole, roleFromMetadata(target.metadata))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (action.action === "remove") {
    await roomService.removeParticipant(roomName, action.targetIdentity);
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  await Promise.all(
    target.tracks
      .filter((track) => track.source === TrackSource.MICROPHONE && !track.muted)
      .map((track) => roomService.mutePublishedTrack(roomName, target.identity, track.sid, true)),
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
