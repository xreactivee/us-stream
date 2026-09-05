import type { Question } from "@us-stream/db";

export interface QuestionView {
  id: string;
  body: string;
  askedByName: string;
  upvotes: number;
  hasUpvoted: boolean;
  isAnswered: boolean;
  createdAt: number;
}

/**
 * Only the count of upvotes crosses the wire, never the list of who cast them.
 * People ask more freely when they are not publishing who agreed with them.
 */
export function serialiseQuestion(question: Question, viewerIdentity: string): QuestionView {
  return {
    id: String(question._id),
    body: question.body,
    askedByName: question.askedByName,
    upvotes: question.upvoters.length,
    hasUpvoted: question.upvoters.includes(viewerIdentity),
    isAnswered: question.answeredAt !== null,
    createdAt: question.createdAt.getTime(),
  };
}
