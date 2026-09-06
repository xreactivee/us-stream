import { isValidObjectId, RoomModel, ScheduledMeetingModel } from "@us-stream/db";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { buildInvite } from "@/lib/calendar";
import { connectDb } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(_request: NextRequest, context: RouteContext<"/api/scheduled/[id]/ics">) {
  const { id } = await context.params;
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  await connectDb();

  const scheduled = await ScheduledMeetingModel.findById(id).lean();

  if (!scheduled) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const room = await RoomModel.findOne({
    _id: scheduled.roomId,
    $or: [{ ownerId: session.user.id }, { "members.userId": session.user.id }],
  })
    .select("name slug")
    .lean();

  if (!room) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const invite = buildInvite({
    id: String(scheduled._id),
    title: scheduled.title,
    startsAt: scheduled.startsAt,
    durationMinutes: scheduled.durationMinutes,
    roomName: room.name,
    joinUrl: new URL(`/r/${room.slug}`, env.BETTER_AUTH_URL).toString(),
  });

  if (!invite) {
    return NextResponse.json({ error: "could_not_build_invite" }, { status: 500 });
  }

  return new NextResponse(invite, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${room.slug}.ics"`,
    },
  });
}
