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
  _id: Types.ObjectId;
  meetingId: Types.ObjectId;
  senderIdentity: string;
  senderName: string;
  body: string;
  kind: "text" | "system";
  replyToId: Types.ObjectId | null;
  /** Set for private messages; `null` for messages sent to the whole room. */
  toIdentity: string | null;
  createdAt: Date;
}

const messageSchema = new Schema<Message>(
  {
    // Generated on the sending client so the live event and the stored
    // document share an id and a replayed message cannot duplicate.
    _id: { type: Schema.Types.ObjectId, required: true },
    meetingId: { type: Schema.Types.ObjectId, required: true },
    senderIdentity: { type: String, required: true },
    senderName: { type: String, required: true },
    body: { type: String, required: true },
    kind: { type: String, enum: ["text", "system"], required: true, default: "text" },
    replyToId: { type: Schema.Types.ObjectId, default: null },
    toIdentity: { type: String, default: null },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { collection: "messages" },
);

messageSchema.index({ meetingId: 1, createdAt: 1 });

export const MessageModel = defineModel("Message", messageSchema);
