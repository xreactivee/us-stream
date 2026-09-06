import { QuestionModel } from "@us-stream/db";
import { askQuestionSchema } from "@us-stream/shared";
import { type NextRequest, NextResponse } from "next/server";
import { resolveCaller } from "@/lib/caller";
import { connectDb } from "@/lib/db";
import { getActiveMeeting } from "@/lib/meetings";
import { getRoomBySlug } from "@/lib/rooms";
import { serialiseQuestion } from "./serialise";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/rooms/[slug]/questions">,
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
    return NextResponse.json({ questions: [] });
  }

  const questions = await QuestionModel.find({ meetingId: meeting._id }).lean();

  questions.sort((a, b) => {
    const answered = Number(a.answeredAt !== null) - Number(b.answeredAt !== null);

    return answered !== 0
      ? answered
      : b.upvoters.length - a.upvoters.length || a.createdAt.getTime() - b.createdAt.getTime();
  });

  return NextResponse.json({
    questions: questions.map((question) => serialiseQuestion(question, caller.identity)),
  });
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/rooms/[slug]/questions">,
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

  const body = askQuestionSchema.safeParse(await request.json().catch(() => null));

  if (!body.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const meeting = await getActiveMeeting(room._id);

  if (!meeting) {
    return NextResponse.json({ error: "no_active_meeting" }, { status: 409 });
  }

  const created = await QuestionModel.create({
    meetingId: meeting._id,
    askedByIdentity: caller.identity,
    askedByName: caller.displayName,
    body: body.data.body,
    upvoters: [],
  });

  return NextResponse.json(
    { question: serialiseQuestion(created.toObject(), caller.identity) },
    { status: 201 },
  );
}
