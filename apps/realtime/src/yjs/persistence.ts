import { DocModel, type Types } from "@us-stream/db";
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

/**
 * Normalises whatever the driver hands back for a binary field.
 *
 * A hydrated Mongoose document yields a Node `Buffer`, but `.lean()` yields the
 * driver's `Binary` wrapper, whose `length` is a *method* — so a naive
 * `state.length > 0` check silently reads false and the document loads empty.
 * That failure is invisible until the second time somebody opens the board.
 */
function toBytes(value: unknown): Uint8Array {
  // Buffer is already a Uint8Array, which covers the hydrated case.
  if (value instanceof Uint8Array) {
    return value;
  }

  const binary = value as { buffer?: unknown; value?: () => Uint8Array } | null;

  if (typeof binary?.value === "function") {
    return new Uint8Array(binary.value());
  }

  if (binary?.buffer instanceof Uint8Array) {
    return new Uint8Array(binary.buffer);
  }

  return new Uint8Array();
}

export async function loadDoc(roomId: Types.ObjectId, kind: DocKind, doc: Y.Doc): Promise<void> {
  const stored = await DocModel.findOne({ roomId, kind }).lean();

  if (!stored) {
    return;
  }

  const bytes = toBytes(stored.state);

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
