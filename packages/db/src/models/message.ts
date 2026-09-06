import { Schema } from "mongoose";
import type { Message } from "../types";
import { defineModel } from "./define";

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
