import { AdmissionRequestModel, type Room, Types } from "@us-stream/db";
import { admitParticipantSchema, hasAuthority } from "@us-stream/shared";
import { type NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { getRoomBySlug, roleForUser } from "@/lib/rooms";
import { getSession } from "@/lib/session";

export interface PendingAdmission {
  id: string;
  displayName: string;
  /** Unix milliseconds, so the client can show how long they have waited. */
  requestedAt: number;
  /** True for someone with an account, which is a small vote of confidence. */
  isSignedIn: boolean;
}

type Gate = { ok: true; room: Room } | { ok: false; response: NextResponse };

/**
 * The waiting room, from the host's side.
 *
 * Both handlers demand cohost or better in this specific room. The people in
 * the queue are by definition not in the call yet, so nothing about them
 * reaches anyone who has not been trusted with letting them in.
 */
async function requireHost(slug: string): Promise<Gate> {
  const session = await getSession();

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }),
    };
  }

  await connectDb();
  const room = await getRoomBySlug(slug);

  if (!room) {
    return { ok: false, response: NextResponse.json({ error: "room_not_found" }, { status: 404 }) };
  }

  if (!hasAuthority(roleForUser(room, session.user.id), "cohost")) {
    return { ok: false, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }

  return { ok: true, room };
}

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/rooms/[slug]/admissions">,
) {
  const { slug } = await context.params;
  const gate = await requireHost(slug);

  if (!gate.ok) {
    return gate.response;
  }

  const pending = await AdmissionRequestModel.find({ roomId: gate.room._id, status: "pending" })
    .sort({ createdAt: 1 })
    .limit(50)
    .lean();

  return NextResponse.json({
    admissions: pending.map(
      (entry): PendingAdmission => ({
        id: String(entry._id),
        displayName: entry.displayName,
        requestedAt: entry.createdAt.getTime(),
        isSignedIn: Boolean(entry.userId),
      }),
    ),
  });
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/rooms/[slug]/admissions">,
) {
  const { slug } = await context.params;
  const body = admitParticipantSchema.safeParse(await request.json().catch(() => null));

  if (!body.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const gate = await requireHost(slug);

  if (!gate.ok) {
    return gate.response;
  }

  if (!Types.ObjectId.isValid(body.data.requestId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Scoped to this room as well as to the id: a host of one room must not be
  // able to resolve a request belonging to another.
  const updated = await AdmissionRequestModel.findOneAndUpdate(
    { _id: new Types.ObjectId(body.data.requestId), roomId: gate.room._id, status: "pending" },
    {
      $set: {
        status: body.data.action === "admit" ? "admitted" : "denied",
        resolvedAt: new Date(),
      },
    },
  );

  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
