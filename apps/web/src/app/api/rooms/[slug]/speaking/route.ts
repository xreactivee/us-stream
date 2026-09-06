import { MeetingModel } from "@us-stream/db";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveCaller } from "@/lib/caller";
import { connectDb } from "@/lib/db";
import { getActiveMeeting } from "@/lib/meetings";
import { getRoomBySlug } from "@/lib/rooms";

const bodySchema = z.object({
  speakingMs: z
    .number()
    .int()
    .positive()
    .max(10 * 60 * 1000),
});

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/rooms/[slug]/speaking">,
) {
  const { slug } = await context.params;

  await connectDb();
  const room = await getRoomBySlug(slug);

  if (!room) {
    return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  }

  const caller = await resolveCaller(request, room);

  if (!caller) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null));

  if (!body.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const meeting = await getActiveMeeting(room._id);

  if (!meeting) {
    return NextResponse.json({ error: "no_active_meeting" }, { status: 409 });
  }

  await MeetingModel.updateOne(
    { _id: meeting._id, "participants.identity": caller.identity },
    { $inc: { "participants.$.speakingMs": body.data.speakingMs } },
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
