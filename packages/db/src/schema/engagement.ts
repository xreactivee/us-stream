/** Polls and Q&A — the parts of a meeting where participants answer back. */

import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { meeting } from "./meetings";

export interface PollOption {
  /** Stable index within the poll; votes reference it. */
  index: number;
  label: string;
}

export const poll = pgTable(
  "poll",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meeting.id, { onDelete: "cascade" }),
    createdByIdentity: text("created_by_identity").notNull(),
    question: text("question").notNull(),
    options: jsonb("options").$type<PollOption[]>().notNull(),
    allowMultiple: boolean("allow_multiple").notNull().default(false),
    isAnonymous: boolean("is_anonymous").notNull().default(true),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("poll_meeting_id_idx").on(t.meetingId)],
);

export const pollVote = pgTable(
  "poll_vote",
  {
    pollId: uuid("poll_id")
      .notNull()
      .references(() => poll.id, { onDelete: "cascade" }),
    voterIdentity: text("voter_identity").notNull(),
    optionIndex: integer("option_index").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.pollId, t.voterIdentity, t.optionIndex] })],
);

export const question = pgTable(
  "question",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meeting.id, { onDelete: "cascade" }),
    askedByIdentity: text("asked_by_identity").notNull(),
    askedByName: text("asked_by_name").notNull(),
    body: text("body").notNull(),
    upvotes: integer("upvotes").notNull().default(0),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("question_meeting_id_idx").on(t.meetingId)],
);

export const questionUpvote = pgTable(
  "question_upvote",
  {
    questionId: uuid("question_id")
      .notNull()
      .references(() => question.id, { onDelete: "cascade" }),
    voterIdentity: text("voter_identity").notNull(),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.voterIdentity] })],
);
