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

export function useWhiteboard(connection: YjsConnection) {
  const shapesMap = useMemo(
    () => connection.doc.getMap<BoardShape>("whiteboard.shapes"),
    [connection.doc],
  );

  const [shapes, setShapes] = useState<BoardShape[]>([]);
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);

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

const LOCAL_ORIGIN = "local";
