import { isValidObjectId, QuestionModel } from "@us-stream/db";
import { type NextRequest, NextResponse } from "next/server";
import { resolveCaller } from "@/lib/caller";
import { connectDb } from "@/lib/db";
import { getRoomBySlug } from "@/lib/rooms";
import { serialiseQuestion } from "../serialise";

async function load(request: NextRequest, slug: string, questionId: string) {
  if (!isValidObjectId(questionId)) {
    return { error: NextResponse.json({ error: "invalid_id" }, { status: 400 }) } as const;
  }

  await connectDb();
  const room = await getRoomBySlug(slug);

  if (!room) {
    return { error: NextResponse.json({ error: "room_not_found" }, { status: 404 }) } as const;
  }

  const caller = await resolveCaller(request, room);

  if (!caller) {
    return { error: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) } as const;
  }

  const question = await QuestionModel.findById(questionId);

  if (!question) {
    return { error: NextResponse.json({ error: "question_not_found" }, { status: 404 }) } as const;
  }

  return { caller, question } as const;
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/rooms/[slug]/questions/[questionId]">,
) {
  const { slug, questionId } = await context.params;
  const loaded = await load(request, slug, questionId);

  if ("error" in loaded) {
    return loaded.error;
  }

  const { caller, question } = loaded;

  question.upvoters = question.upvoters.includes(caller.identity)
    ? question.upvoters.filter((voter) => voter !== caller.identity)
    : [...question.upvoters, caller.identity];

  await question.save();

  return NextResponse.json(
    { question: serialiseQuestion(question.toObject(), caller.identity) },
    { status: 201 },
  );
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/rooms/[slug]/questions/[questionId]">,
) {
  const { slug, questionId } = await context.params;
  const loaded = await load(request, slug, questionId);

  if ("error" in loaded) {
    return loaded.error;
  }

  const { caller, question } = loaded;

  if (!caller.isHost) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  question.answeredAt = new Date();
  await question.save();

  return new NextResponse(null, { status: 204 });
}
