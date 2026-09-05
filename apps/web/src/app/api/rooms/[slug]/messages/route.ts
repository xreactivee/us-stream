import { MessageModel } from "@us-stream/db";
import { CHAT_HISTORY_PAGE_SIZE, chatMessageEvent } from "@us-stream/shared";
import { type NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { GUEST_COOKIE_NAME, verifyGuestToken } from "@/lib/guest";
import { getActiveMeeting } from "@/lib/meetings";
import { getRoomBySlug } from "@/lib/rooms";
import { getSession } from "@/lib/session";

/**
 * Chat storage.
 *
 * Delivery is the data channel's job — it is instant and needs no server. This
 * endpoint exists so the conversation survives the meeting, which is why the
 * sender writes here as well as publishing. The message id is generated on the
 * client, so a retry writes the same document rather than a duplicate.
 */

interface Caller {
  identity: string;
  displayName: string;
}

/** Resolves who is asking, from the session or a signed guest cookie. */
async function resolveCaller(request: NextRequest): Promise<Caller | null> {
  const session = await getSession();

  if (session) {
    return { identity: `user_${session.user.id}`, displayName: session.user.name };
  }

  const guest = verifyGuestToken(request.cookies.get(GUEST_COOKIE_NAME)?.value ?? "");

  return guest ? { identity: guest.id, displayName: guest.displayName } : null;
}

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/rooms/[slug]/messages">,
) {
  const { slug } = await context.params;
  const caller = await resolveCaller(request);

  if (!caller) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  await connectDb();
  const room = await getRoomBySlug(slug);

  if (!room) {
    return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  }

  const meeting = await getActiveMeeting(room._id);

  if (!meeting) {
    return NextResponse.json({ messages: [] });
  }

  const messages = await MessageModel.find({
    meetingId: meeting._id,
    // Private messages are only ever returned to the two people involved.
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
  const caller = await resolveCaller(request);

  if (!caller) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = chatMessageEvent.safeParse(await request.json().catch(() => null));

  if (!body.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  await connectDb();
  const room = await getRoomBySlug(slug);

  if (!room) {
    return NextResponse.json({ error: "room_not_found" }, { status: 404 });
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
        // Sender identity and name come from the session or the signed guest
        // cookie, never from the request body — otherwise anyone who can post
        // could post as anyone.
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

  return NextResponse.json({ ok: true });
}
