import { MessageModel } from "@us-stream/db";
import { CHAT_HISTORY_PAGE_SIZE, chatMessageEvent } from "@us-stream/shared";
import { type NextRequest, NextResponse } from "next/server";
import { resolveCaller } from "@/lib/caller";
import { connectDb } from "@/lib/db";
import { getActiveMeeting } from "@/lib/meetings";
import { getRoomBySlug } from "@/lib/rooms";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/rooms/[slug]/messages">,
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

  const meeting = await getActiveMeeting(room._id);

  if (!meeting) {
    return NextResponse.json({ messages: [] });
  }

  const messages = await MessageModel.find({
    meetingId: meeting._id,
    $or: [
      { toIdentity: null },
      { toIdentity: caller.identity },
      { senderIdentity: caller.identity },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(CHAT_HISTORY_PAGE_SIZE)
    .lean();

  return NextResponse.json({
    messages: messages.reverse().map((message) => ({
      id: String(message._id),
      senderIdentity: message.senderIdentity,
      senderName: message.senderName,
      body: message.body,
      toIdentity: message.toIdentity,
      sentAt: message.createdAt.getTime(),
    })),
  });
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/rooms/[slug]/messages">,
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

  const body = chatMessageEvent.safeParse(await request.json().catch(() => null));

  if (!body.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const meeting = await getActiveMeeting(room._id);

  if (!meeting) {
    return NextResponse.json({ error: "no_active_meeting" }, { status: 409 });
  }

  await MessageModel.updateOne(
    { _id: body.data.id },
    {
      $setOnInsert: {
        meetingId: meeting._id,
        senderIdentity: caller.identity,
        senderName: caller.displayName,
        body: body.data.body,
        kind: "text",
        replyToId: body.data.replyToId ?? null,
        toIdentity: body.data.toIdentity ?? null,
        createdAt: new Date(body.data.sentAt),
      },
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
