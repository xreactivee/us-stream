import { RoomModel, ScheduledMeetingModel, Types } from "@us-stream/db";
import { scheduleMeetingSchema } from "@us-stream/shared";
import { type NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = scheduleMeetingSchema.safeParse(await request.json().catch(() => null));

  if (!body.success || !Types.ObjectId.isValid(body.data.roomId)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  await connectDb();

  const room = await RoomModel.findOne({
    _id: new Types.ObjectId(body.data.roomId),
    $or: [{ ownerId: session.user.id }, { "members.userId": session.user.id }],
  })
    .select("_id")
    .lean();

  if (!room) {
    return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  }

  const created = await ScheduledMeetingModel.create({
    roomId: room._id,
    createdById: session.user.id,
    title: body.data.title,
    startsAt: body.data.startsAt,
    durationMinutes: body.data.durationMinutes,
  });

  return NextResponse.json({ id: String(created._id) }, { status: 201 });
}
