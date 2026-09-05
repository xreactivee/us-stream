import type { Types } from "@us-stream/db";
import { DOC_SNAPSHOT_INTERVAL_MS, type DocKind } from "@us-stream/shared";
import * as encoding from "lib0/encoding";
import { Awareness, encodeAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness";
import { writeUpdate } from "y-protocols/sync";
import * as Y from "yjs";
import { loadDoc, saveDoc } from "./persistence";

/** The two message types of the y-websocket protocol. */
export const MESSAGE_SYNC = 0;
export const MESSAGE_AWARENESS = 1;

export interface DocConnection {
  send(data: Uint8Array): void;
  /**
   * Awareness client ids this connection introduced. Kept per connection so
   * that when it closes we remove that person's cursor and nobody else's.
   */
  controlledIds: Set<number>;
}

export interface SharedDoc {
  key: string;
  roomId: Types.ObjectId;
  kind: DocKind;
  doc: Y.Doc;
  awareness: Awareness;
  connections: Set<DocConnection>;
  /** Set while a document has unsaved changes, cleared by the snapshot. */
  dirty: boolean;
  snapshotTimer: NodeJS.Timeout | null;
}

/**
 * One `Y.Doc` per room and kind, shared by everyone editing it.
 *
 * The registry is process-local. That is correct for a single instance and the
 * reason a second replica needs Redis before it can be turned on: two
 * instances each holding their own copy of the same board would diverge
 * silently. Until then the service runs as one replica on purpose.
 */
const docs = new Map<string, SharedDoc>();

/** Documents load lazily, and a second caller waits for the first. */
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

    // The server holds no cursor of its own.
    shared.awareness.setLocalState(null);

    /*
     * Both handlers are registered once per document, not once per
     * connection. Registering them per connection would fan every update out
     * once for each editor in the room, which is quadratic and was the first
     * thing to go wrong here.
     *
     * Broadcasting back to the originating client is deliberate and harmless:
     * Yjs applies an update it already has as a no-op, and the alternative —
     * threading the origin through every path — is more code for no gain.
     */
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

/**
 * Snapshots while people are editing, so a crash costs at most one interval
 * rather than the whole session.
 */
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

  // Take down this person's cursor, and only theirs.
  if (connection.controlledIds.size > 0) {
    removeAwarenessStates(shared.awareness, [...connection.controlledIds], null);
  }
}

/**
 * Called when the last editor leaves: one final save, then the document is
 * dropped so an idle room costs no memory. It is reloaded from storage the
 * next time someone opens it.
 */
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

/** Saves everything still open. Used on shutdown. */
export async function flushAll(): Promise<void> {
  await Promise.all(
    [...docs.values()].map((shared) => saveDoc(shared.roomId, shared.kind, shared.doc)),
  );
}
