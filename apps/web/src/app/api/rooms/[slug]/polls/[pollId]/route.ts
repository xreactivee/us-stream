import { isValidObjectId, PollModel, Types } from "@us-stream/db";
import { votePollSchema } from "@us-stream/shared";
import { type NextRequest, NextResponse } from "next/server";
import { resolveCaller } from "@/lib/caller";
import { connectDb } from "@/lib/db";
import { getRoomBySlug } from "@/lib/rooms";
import { serialisePoll } from "../serialise";

async function load(request: NextRequest, slug: string, pollId: string) {
  if (!isValidObjectId(pollId)) {
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

  const poll = await PollModel.findById(pollId);

  if (!poll) {
    return { error: NextResponse.json({ error: "poll_not_found" }, { status: 404 }) } as const;
  }

  return { room, caller, poll } as const;
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/rooms/[slug]/polls/[pollId]">,
) {
  const { slug, pollId } = await context.params;
  const loaded = await load(request, slug, pollId);

  if ("error" in loaded) {
    return loaded.error;
  }

  const { caller, poll } = loaded;

  if (poll.closedAt) {
    return NextResponse.json({ error: "poll_closed" }, { status: 409 });
  }

  const body = votePollSchema.safeParse(await request.json().catch(() => null));

  if (!body.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const valid = body.data.optionIndexes.filter((index) =>
    poll.options.some((option) => option.index === index),
  );

  if (valid.length === 0) {
    return NextResponse.json({ error: "invalid_option" }, { status: 400 });
  }

  const chosen = poll.allowMultiple ? valid : valid.slice(0, 1);

  // Replacing this voter's entries rather than appending means voting twice
  // changes an answer instead of stuffing the ballot.
  poll.votes = [
    ...poll.votes.filter((vote) => vote.voterIdentity !== caller.identity),
    ...chosen.map((optionIndex) => ({
      voterIdentity: caller.identity,
      optionIndex,
      createdAt: new Date(),
    })),
  ];

  await poll.save();

  return NextResponse.json({ poll: serialisePoll(poll.toObject(), caller.identity) });
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/rooms/[slug]/polls/[pollId]">,
) {
  const { slug, pollId } = await context.params;
  const loaded = await load(request, slug, pollId);

  if ("error" in loaded) {
    return loaded.error;
  }

  const { caller, poll } = loaded;

  if (!caller.isHost) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await PollModel.updateOne(
    { _id: new Types.ObjectId(pollId) },
    { $set: { closedAt: new Date() } },
  );

  poll.closedAt = new Date();

  return NextResponse.json({ poll: serialisePoll(poll.toObject(), caller.identity) });
}
