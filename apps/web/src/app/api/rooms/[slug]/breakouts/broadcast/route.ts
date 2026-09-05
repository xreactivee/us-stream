import { CHAT_MESSAGE_MAX_LENGTH, hasAuthority } from "@us-stream/shared";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDb } from "@/lib/db";
import { callRealtime } from "@/lib/realtime";
import { getRoomBySlug, roleForUser } from "@/lib/rooms";
import { getSession } from "@/lib/session";

const bodySchema = z.object({ body: z.string().trim().min(1).max(CHAT_MESSAGE_MAX_LENGTH) });

/** Sends one message into every open breakout room. Hosts only. */
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/rooms/[slug]/breakouts/broadcast">,
) {
  const { slug } = await context.params;
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  await connectDb();
  const room = await getRoomBySlug(slug);

  if (!room) {
    return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  }

  if (!hasAuthority(roleForUser(room, session.user.id), "cohost")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null));

  if (!body.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await callRealtime<{ delivered: number }>("/internal/breakouts/broadcast", {
    roomId: String(room._id),
    body: body.data.body,
  });

  return result.ok
    ? NextResponse.json(result.data)
    : NextResponse.json({ error: "realtime_unavailable" }, { status: result.status });
}
