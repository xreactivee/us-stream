import { DOC_KINDS } from "@us-stream/shared";
import { Schema } from "mongoose";
import type { CollaborativeDoc } from "../types";
import { defineModel } from "./define";

const docSchema = new Schema<CollaborativeDoc>(
  {
    roomId: { type: Schema.Types.ObjectId, required: true },
    kind: { type: String, enum: DOC_KINDS, required: true },
    state: { type: Buffer, required: true },
  },
  { timestamps: true, collection: "docs" },
);

docSchema.index({ roomId: 1, kind: 1 }, { unique: true });

export const DocModel = defineModel("Doc", docSchema);
