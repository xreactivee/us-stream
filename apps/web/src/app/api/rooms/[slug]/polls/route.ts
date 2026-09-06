import { PollModel } from "@us-stream/db";
import { createPollSchema } from "@us-stream/shared";
import { type NextRequest, NextResponse } from "next/server";
import { resolveCaller } from "@/lib/caller";
import { connectDb } from "@/lib/db";
import { getActiveMeeting } from "@/lib/meetings";
import { getRoomBySlug } from "@/lib/rooms";
import { serialisePoll } from "./serialise";

export async function GET(request: NextRequest, context: RouteContext<"/api/rooms/[slug]/polls">) {
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

  const meeting = await getActiveMeeting(room._id);

  if (!meeting) {
    return NextResponse.json({ polls: [] });
  }

  const polls = await PollModel.find({ meetingId: meeting._id }).sort({ createdAt: -1 }).lean();

  return NextResponse.json({ polls: polls.map((poll) => serialisePoll(poll, caller.identity)) });
}

export async function POST(request: NextRequest, context: RouteContext<"/api/rooms/[slug]/polls">) {
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

  if (!caller.isHost) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = createPollSchema.safeParse(await request.json().catch(() => null));

  if (!body.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const meeting = await getActiveMeeting(room._id);

  if (!meeting) {
    return NextResponse.json({ error: "no_active_meeting" }, { status: 409 });
  }

  const created = await PollModel.create({
    meetingId: meeting._id,
    createdByIdentity: caller.identity,
    question: body.data.question,
    options: body.data.options.map((label, index) => ({ index, label })),
    votes: [],
    allowMultiple: body.data.allowMultiple,
    isAnonymous: body.data.isAnonymous,
  });

  return NextResponse.json(
    { poll: serialisePoll(created.toObject(), caller.identity) },
    { status: 201 },
  );
}
