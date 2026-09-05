import { BreakoutRoomModel } from "@us-stream/db";
import { breakoutRoomSchema, hasAuthority } from "@us-stream/shared";
import { type NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { getActiveMeeting } from "@/lib/meetings";
import { callRealtime } from "@/lib/realtime";
import { getRoomBySlug, roleForUser } from "@/lib/rooms";
import { getSession } from "@/lib/session";

/**
 * Breakout rooms.
 *
 * The work happens in the realtime service, which holds the LiveKit secret and
 * the countdown; this endpoint exists to decide whether the person asking is
 * allowed to ask. Splitting it that way keeps the host's browser from ever
 * handling other people's access tokens.
 */
async function requireHost(slug: string) {
  const session = await getSession();

  if (!session) {
    return { error: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) } as const;
  }

  await connectDb();
  const room = await getRoomBySlug(slug);

  if (!room) {
    return { error: NextResponse.json({ error: "room_not_found" }, { status: 404 }) } as const;
  }

  if (!hasAuthority(roleForUser(room, session.user.id), "cohost")) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) } as const;
  }

  return { room, session } as const;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/rooms/[slug]/breakouts">,
) {
  const { slug } = await context.params;
  const guard = await requireHost(slug);

  if ("error" in guard) {
    return guard.error;
  }

  const meeting = await getActiveMeeting(guard.room._id);

  if (!meeting) {
    return NextResponse.json({ breakouts: [] });
  }

  const breakouts = await BreakoutRoomModel.find({ meetingId: meeting._id, closedAt: null }).lean();

  return NextResponse.json({
    breakouts: breakouts.map((breakout) => ({
      id: String(breakout._id),
      name: breakout.name,
      participants: breakout.assignments.length,
      closesAt: breakout.closesAt ? breakout.closesAt.getTime() : null,
    })),
  });
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/rooms/[slug]/breakouts">,
) {
  const { slug } = await context.params;
  const guard = await requireHost(slug);

  if ("error" in guard) {
    return guard.error;
  }

  const body = breakoutRoomSchema.safeParse(await request.json().catch(() => null));

  if (!body.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await callRealtime<{ opened: number; moved: number }>("/internal/breakouts/open", {
    roomId: String(guard.room._id),
    count: body.data.count,
    durationMinutes: body.data.durationMinutes,
    // The host stays behind; splitting the room is not the same as leaving it.
    keepIdentities: [`user_${guard.session.user.id}`],
  });

  return result.ok
    ? NextResponse.json(result.data)
    : NextResponse.json({ error: "realtime_unavailable" }, { status: result.status });
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/rooms/[slug]/breakouts">,
) {
  const { slug } = await context.params;
  const guard = await requireHost(slug);

  if ("error" in guard) {
    return guard.error;
  }

  const result = await callRealtime<{ recalled: number }>("/internal/breakouts/recall", {
    roomId: String(guard.room._id),
  });

  return result.ok
    ? NextResponse.json(result.data)
    : NextResponse.json({ error: "realtime_unavailable" }, { status: result.status });
}
