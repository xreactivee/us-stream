/**
 * Chat is delivered live over LiveKit data channels; these documents exist so
 * the conversation survives the meeting and can be read back from its history.
 * The realtime service writes them, the web app only reads them.
 *
 * This is the one child collection that is not embedded: a long meeting can
 * produce more messages than belong in a single document.
 */

import { Schema, type Types } from "mongoose";
import { defineModel } from "./define";

export interface Message {
  /**
   * A UUID generated on the sending client, used as the document's `_id`.
   *
   * The same id travels over the data channel and into storage, so the sender
   * can render optimistically, receivers can discard a duplicate frame, and a
   * retried write updates the same document instead of creating a second one.
   * That is worth more here than the ordering an ObjectId would give, and the
   * `meetingId + createdAt` index already provides the ordering.
   */
  _id: string;
  meetingId: Types.ObjectId;
  senderIdentity: string;
  senderName: string;
  body: string;
  kind: "text" | "system";
  replyToId: string | null;
  /** Set for private messages; `null` for messages sent to the whole room. */
  toIdentity: string | null;
  createdAt: Date;
}

const messageSchema = new Schema<Message>(
  {
    _id: { type: String, required: true },
    meetingId: { type: Schema.Types.ObjectId, required: true },
    senderIdentity: { type: String, required: true },
    senderName: { type: String, required: true },
    body: { type: String, required: true },
    kind: { type: String, enum: ["text", "system"], required: true, default: "text" },
    replyToId: { type: String, default: null },
    toIdentity: { type: String, default: null },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { collection: "messages", _id: false },
);

messageSchema.index({ meetingId: 1, createdAt: 1 });

export const MessageModel = defineModel("Message", messageSchema);
