import { Schema } from "mongoose";
import type { Poll, PollOption, PollVote, Question } from "../types";
import { defineModel } from "./define";

const pollOptionSchema = new Schema<PollOption>(
  {
    index: { type: Number, required: true },
    label: { type: String, required: true },
  },
  { _id: false },
);

const pollVoteSchema = new Schema<PollVote>(
  {
    voterIdentity: { type: String, required: true },
    optionIndex: { type: Number, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const pollSchema = new Schema<Poll>(
  {
    meetingId: { type: Schema.Types.ObjectId, required: true, index: true },
    createdByIdentity: { type: String, required: true },
    question: { type: String, required: true },
    options: { type: [pollOptionSchema], required: true },
    votes: { type: [pollVoteSchema], default: [] },
    allowMultiple: { type: Boolean, required: true, default: false },
    isAnonymous: { type: Boolean, required: true, default: true },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "polls" },
);

export const PollModel = defineModel("Poll", pollSchema);

const questionSchema = new Schema<Question>(
  {
    meetingId: { type: Schema.Types.ObjectId, required: true, index: true },
    askedByIdentity: { type: String, required: true },
    askedByName: { type: String, required: true },
    body: { type: String, required: true },
    upvoters: { type: [String], default: [] },
    answeredAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "questions" },
);

export const QuestionModel = defineModel("Question", questionSchema);
