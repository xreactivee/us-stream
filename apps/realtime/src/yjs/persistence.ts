import { bytesOf, DocModel, type Types } from "@us-stream/db";
import type { DocKind } from "@us-stream/shared";
import * as Y from "yjs";

export async function loadDoc(roomId: Types.ObjectId, kind: DocKind, doc: Y.Doc): Promise<void> {
  const stored = await DocModel.findOne({ roomId, kind }).lean();

  if (!stored) {
    return;
  }

  const bytes = bytesOf(stored.state);

  if (bytes.byteLength > 0) {
    Y.applyUpdate(doc, bytes);
  }
}

export async function saveDoc(roomId: Types.ObjectId, kind: DocKind, doc: Y.Doc): Promise<void> {
  const state = Buffer.from(Y.encodeStateAsUpdate(doc));

  await DocModel.updateOne(
    { roomId, kind },
    { $set: { state, updatedAt: new Date() }, $setOnInsert: { roomId, kind } },
    { upsert: true },
  );
}
