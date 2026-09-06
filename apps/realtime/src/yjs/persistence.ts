import { bytesOf, DocModel, type Types } from "@us-stream/db";
import type { DocKind } from "@us-stream/shared";
import * as Y from "yjs";

/**
 * Yjs documents in MongoDB.
 *
 * A whole encoded document is stored rather than an append-only log of
 * updates. A log would be smaller per write but has to be compacted, and a
 * whiteboard for a small team is a few hundred kilobytes at worst — well under
 * MongoDB's 16MB document ceiling, and simple enough that a corrupt log can
 * never be the reason someone loses their board.
 */

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
