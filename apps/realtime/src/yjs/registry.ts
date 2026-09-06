import type { Types } from "@us-stream/db";
import { DOC_SNAPSHOT_INTERVAL_MS, type DocKind } from "@us-stream/shared";
import * as encoding from "lib0/encoding";
import { Awareness, encodeAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness";
import { writeUpdate } from "y-protocols/sync";
import * as Y from "yjs";
import type { DocConnection, SharedDoc } from "../types";
import { loadDoc, saveDoc } from "./persistence";

export const MESSAGE_SYNC = 0;
export const MESSAGE_AWARENESS = 1;

export type { DocConnection, SharedDoc };

const docs = new Map<string, SharedDoc>();
const loading = new Map<string, Promise<SharedDoc>>();

function broadcast(shared: SharedDoc, message: Uint8Array): void {
  for (const connection of shared.connections) {
    connection.send(message);
  }
}

export async function getSharedDoc(roomId: Types.ObjectId, kind: DocKind): Promise<SharedDoc> {
  const key = `${roomId.toString()}:${kind}`;
  const existing = docs.get(key);

  if (existing) {
    return existing;
  }

  const inFlight = loading.get(key);

  if (inFlight) {
    return inFlight;
  }

  const promise = (async () => {
    const doc = new Y.Doc();
    await loadDoc(roomId, kind, doc);

    const shared: SharedDoc = {
      key,
      roomId,
      kind,
      doc,
      awareness: new Awareness(doc),
      connections: new Set(),
      dirty: false,
      snapshotTimer: null,
    };

    shared.awareness.setLocalState(null);

    doc.on("update", (update: Uint8Array) => {
      shared.dirty = true;

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      writeUpdate(encoder, update);
      broadcast(shared, encoding.toUint8Array(encoder));
    });

    shared.awareness.on(
      "update",
      (
        { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
        origin: unknown,
      ) => {
        const changed = [...added, ...updated, ...removed];

        if (isDocConnection(origin)) {
          for (const clientId of added) {
            origin.controlledIds.add(clientId);
          }
          for (const clientId of removed) {
            origin.controlledIds.delete(clientId);
          }
        }

        if (changed.length === 0) {
          return;
        }

        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
        encoding.writeVarUint8Array(encoder, encodeAwarenessUpdate(shared.awareness, changed));
        broadcast(shared, encoding.toUint8Array(encoder));
      },
    );

    docs.set(key, shared);
    loading.delete(key);

    return shared;
  })();

  loading.set(key, promise);

  return promise;
}

function isDocConnection(value: unknown): value is DocConnection {
  return typeof value === "object" && value !== null && "controlledIds" in value;
}

export function startSnapshots(shared: SharedDoc): void {
  if (shared.snapshotTimer) {
    return;
  }

  shared.snapshotTimer = setInterval(() => {
    if (!shared.dirty) {
      return;
    }

    shared.dirty = false;
    void saveDoc(shared.roomId, shared.kind, shared.doc);
  }, DOC_SNAPSHOT_INTERVAL_MS);
}

export function detachConnection(shared: SharedDoc, connection: DocConnection): void {
  shared.connections.delete(connection);

  if (connection.controlledIds.size > 0) {
    removeAwarenessStates(shared.awareness, [...connection.controlledIds], null);
  }
}

export async function releaseIfEmpty(shared: SharedDoc): Promise<void> {
  if (shared.connections.size > 0) {
    return;
  }

  if (shared.snapshotTimer) {
    clearInterval(shared.snapshotTimer);
    shared.snapshotTimer = null;
  }

  await saveDoc(shared.roomId, shared.kind, shared.doc);

  shared.doc.destroy();
  docs.delete(shared.key);
}

export async function flushAll(): Promise<void> {
  await Promise.all(
    [...docs.values()].map((shared) => saveDoc(shared.roomId, shared.kind, shared.doc)),
  );
}
