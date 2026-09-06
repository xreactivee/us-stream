import type { Question } from "@us-stream/db";
import type { QuestionView } from "@/types";

export type { QuestionView };

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
