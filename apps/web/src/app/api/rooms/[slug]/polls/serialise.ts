import type { Poll } from "@us-stream/db";
import type { PollView } from "@/types";

export type { PollView };

export function serialisePoll(poll: Poll, viewerIdentity: string): PollView {
  const tally = new Map<number, number>();
  const voters = new Set<string>();
  const myVotes: number[] = [];

  for (const vote of poll.votes) {
    tally.set(vote.optionIndex, (tally.get(vote.optionIndex) ?? 0) + 1);
    voters.add(vote.voterIdentity);

    if (vote.voterIdentity === viewerIdentity) {
      myVotes.push(vote.optionIndex);
    }
  }

  return {
    id: String(poll._id),
    question: poll.question,
    options: poll.options.map((option) => ({
      index: option.index,
      label: option.label,
      votes: tally.get(option.index) ?? 0,
    })),
    totalVoters: voters.size,
    allowMultiple: poll.allowMultiple,
    isClosed: poll.closedAt !== null,
    myVotes,
  };
}
