import { isValidObjectId, ScheduledMeetingModel } from "@us-stream/db";
import { type NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { getSession } from "@/lib/session";

/** Cancels a scheduled meeting. Only whoever booked it may. */
export async function DELETE(_request: NextRequest, context: RouteContext<"/api/scheduled/[id]">) {
  const { id } = await context.params;
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  await connectDb();

  const result = await ScheduledMeetingModel.deleteOne({
    _id: id,
    createdById: session.user.id,
  });

  return result.deletedCount === 0
    ? NextResponse.json({ error: "not_found" }, { status: 404 })
    : NextResponse.json({ ok: true });
}
