import type { Poll } from "@us-stream/db";

export interface PollView {
  id: string;
  question: string;
  options: { index: number; label: string; votes: number }[];
  totalVoters: number;
  allowMultiple: boolean;
  isClosed: boolean;
  /** Which options the person asking has already chosen. */
  myVotes: number[];
}

/**
 * Turns a poll into what a participant is allowed to see.
 *
 * Only tallies cross the wire, never the list of who voted for what. An
 * anonymous poll whose raw votes are sent to every client is not anonymous,
 * and the difference is invisible until someone opens the network tab.
 */
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
