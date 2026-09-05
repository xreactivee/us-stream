/**
 * Polls and Q&A — the parts of a meeting where participants answer back.
 *
 * Votes and upvotes are embedded arrays rather than their own collections. A
 * poll is always read with its results, and one vote per participant per option
 * keeps the array bounded by the room's capacity.
 */

import { Schema, type Types } from "mongoose";
import { defineModel } from "./define";

export interface PollOption {
  /** Stable index within the poll; votes reference it. */
  index: number;
  label: string;
}

export interface PollVote {
  voterIdentity: string;
  optionIndex: number;
  createdAt: Date;
}

export interface Poll {
  _id: Types.ObjectId;
  meetingId: Types.ObjectId;
  createdByIdentity: string;
  question: string;
  options: PollOption[];
  votes: PollVote[];
  allowMultiple: boolean;
  isAnonymous: boolean;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

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

export interface Question {
  _id: Types.ObjectId;
  meetingId: Types.ObjectId;
  askedByIdentity: string;
  askedByName: string;
  body: string;
  /** Identities rather than a counter, so nobody can upvote twice. */
  upvoters: string[];
  answeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

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
