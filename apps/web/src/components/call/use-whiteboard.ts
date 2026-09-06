"use client";

import { type BoardShape, isBoardShape } from "@us-stream/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as Y from "yjs";
import type { YjsConnection } from "./use-yjs-doc";

export interface RemoteCursor {
  clientId: number;
  name: string;
  color: string;
  x: number;
  y: number;
}

/**
 * The whiteboard's state, backed by one `Y.Map` of shapes.
 *
 * Shapes are keyed by id so two people drawing at the same moment write to
 * different keys and never conflict, and erasing is a delete rather than a
 * splice that would renumber everything after it.
 */
export function useWhiteboard(connection: YjsConnection) {
  const shapesMap = useMemo(
    () => connection.doc.getMap<BoardShape>("whiteboard.shapes"),
    [connection.doc],
  );

  const [shapes, setShapes] = useState<BoardShape[]>([]);
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);

  /**
   * Undo is scoped to this client's own edits. A shared undo that could
   * reverse someone else's drawing is the fastest way to make a whiteboard
   * feel hostile.
   *
   * Built inside the effect that owns it rather than in a memo. A memo is not
   * re-evaluated when React mounts, unmounts and remounts a component — which
   * it does to every component in development — so the cleanup destroyed the
   * manager and the remount handed the buttons the same dead object. Both
   * buttons then did nothing at all, for the life of the page.
   */
  const [undoManager, setUndoManager] = useState<Y.UndoManager | null>(null);
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });

  useEffect(() => {
    const manager = new Y.UndoManager(shapesMap, { trackedOrigins: new Set([LOCAL_ORIGIN]) });

    const sync = () =>
      setHistory({
        canUndo: manager.undoStack.length > 0,
        canRedo: manager.redoStack.length > 0,
      });

    manager.on("stack-item-added", sync);
    manager.on("stack-item-popped", sync);
    manager.on("stack-cleared", sync);

    setUndoManager(manager);
    sync();

    return () => {
      manager.off("stack-item-added", sync);
      manager.off("stack-item-popped", sync);
      manager.off("stack-cleared", sync);
      manager.destroy();
      setUndoManager(null);
      setHistory({ canUndo: false, canRedo: false });
    };
  }, [shapesMap]);

  useEffect(() => {
    const read = () => {
      const next: BoardShape[] = [];

      for (const value of shapesMap.values()) {
        // A peer can write anything into a shared map; a malformed entry is
        // skipped rather than allowed to break the render.
        if (isBoardShape(value)) {
          next.push(value);
        }
      }

      next.sort((a, b) => a.createdAt - b.createdAt);
      setShapes(next);
    };

    read();
    shapesMap.observe(read);

    return () => shapesMap.unobserve(read);
  }, [shapesMap]);

  useEffect(() => {
    const { awareness } = connection.provider;

    const read = () => {
      const next: RemoteCursor[] = [];

      for (const [clientId, state] of awareness.getStates()) {
        if (clientId === awareness.clientID) {
          continue;
        }

        const user = (state as { user?: { name?: string; color?: string } }).user;
        const cursor = (state as { cursor?: { x?: number; y?: number } }).cursor;

        if (user && cursor && typeof cursor.x === "number" && typeof cursor.y === "number") {
          next.push({
            clientId,
            name: user.name ?? "",
            color: user.color ?? "#888",
            x: cursor.x,
            y: cursor.y,
          });
        }
      }

      setCursors(next);
    };

    read();
    awareness.on("change", read);

    return () => awareness.off("change", read);
  }, [connection.provider]);

  const addShape = useCallback(
    (shape: BoardShape) => {
      connection.doc.transact(() => shapesMap.set(shape.id, shape), LOCAL_ORIGIN);
    },
    [connection.doc, shapesMap],
  );

  const eraseShapes = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) {
        return;
      }

      connection.doc.transact(() => {
        for (const id of ids) {
          shapesMap.delete(id);
        }
      }, LOCAL_ORIGIN);
    },
    [connection.doc, shapesMap],
  );

  const clearBoard = useCallback(() => {
    connection.doc.transact(() => {
      for (const key of [...shapesMap.keys()]) {
        shapesMap.delete(key);
      }
    }, LOCAL_ORIGIN);
  }, [connection.doc, shapesMap]);

  const setCursor = useCallback(
    (point: { x: number; y: number } | null) => {
      connection.provider.awareness.setLocalStateField("cursor", point);
    },
    [connection.provider],
  );

  return {
    shapes,
    cursors,
    addShape,
    eraseShapes,
    clearBoard,
    setCursor,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    undo: () => undoManager?.undo(),
    redo: () => undoManager?.redo(),
  };
}

/** Marks a transaction as this client's, so undo only reverses our own work. */
const LOCAL_ORIGIN = "local";
