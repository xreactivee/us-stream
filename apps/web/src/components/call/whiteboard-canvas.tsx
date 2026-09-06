"use client";

import type { BoardColor, BoardShape, BoardTool } from "@us-stream/shared";
import { BOARD_TEXT_MAX_LENGTH } from "@us-stream/shared";
import { type PointerEvent as ReactPointerEvent, useCallback, useRef, useState } from "react";
import { pairsOf, ShapeNode } from "@/components/board-shapes";

export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

interface Draft {
  kind: Exclude<BoardShape["kind"], "text">;
  points: number[];
}

interface TextDraft {
  x: number;
  y: number;
  value: string;
}

const ERASER_RADIUS = 12;

const MIN_SAMPLE_DISTANCE = 2;

export function WhiteboardCanvas({
  shapes,
  cursors,
  tool,
  color,
  width,
  view,
  onViewChange,
  onAddShape,
  onEraseShapes,
  onCursorMove,
  authorName,
}: {
  shapes: BoardShape[];
  cursors: { clientId: number; name: string; color: string; x: number; y: number }[];
  tool: BoardTool;
  color: BoardColor;
  width: number;
  view: ViewTransform;
  onViewChange: (view: ViewTransform) => void;
  onAddShape: (shape: BoardShape) => void;
  onEraseShapes: (ids: string[]) => void;
  onCursorMove: (point: { x: number; y: number } | null) => void;
  authorName: string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [textDraft, setTextDraft] = useState<TextDraft | null>(null);
  const panOrigin = useRef<{
    pointerX: number;
    pointerY: number;
    viewX: number;
    viewY: number;
  } | null>(null);

  const toBoard = useCallback(
    (event: { clientX: number; clientY: number }) => {
      const rect = svgRef.current?.getBoundingClientRect();

      if (!rect) {
        return { x: 0, y: 0 };
      }

      return {
        x: (event.clientX - rect.left - view.x) / view.scale,
        y: (event.clientY - rect.top - view.y) / view.scale,
      };
    },
    [view],
  );

  const eraseAt = useCallback(
    (point: { x: number; y: number }) => {
      const hits = shapes.filter((shape) => shapeHit(shape, point)).map((shape) => shape.id);
      onEraseShapes(hits);
    },
    [shapes, onEraseShapes],
  );

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button === 1 || tool === "pan") {
      panOrigin.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        viewX: view.x,
        viewY: view.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (event.button !== 0) {
      return;
    }

    const point = toBoard(event);
    event.currentTarget.setPointerCapture(event.pointerId);

    if (tool === "eraser") {
      eraseAt(point);
      setDraft({ kind: "pen", points: [] });
      return;
    }

    if (tool === "text") {
      setTextDraft({ x: point.x, y: point.y, value: "" });
      return;
    }

    setDraft({ kind: tool, points: [point.x, point.y] });
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const point = toBoard(event);
    onCursorMove(point);

    if (panOrigin.current) {
      onViewChange({
        ...view,
        x: panOrigin.current.viewX + (event.clientX - panOrigin.current.pointerX),
        y: panOrigin.current.viewY + (event.clientY - panOrigin.current.pointerY),
      });
      return;
    }

    if (!draft) {
      return;
    }

    if (tool === "eraser") {
      eraseAt(point);
      return;
    }

    if (draft.kind === "pen") {
      const lastX = draft.points[draft.points.length - 2];
      const lastY = draft.points[draft.points.length - 1];

      if (
        lastX !== undefined &&
        lastY !== undefined &&
        Math.hypot(point.x - lastX, point.y - lastY) < MIN_SAMPLE_DISTANCE / view.scale
      ) {
        return;
      }

      setDraft({ kind: "pen", points: [...draft.points, point.x, point.y] });
      return;
    }

    setDraft({
      kind: draft.kind,
      points: [draft.points[0] ?? 0, draft.points[1] ?? 0, point.x, point.y],
    });
  }

  function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    panOrigin.current = null;

    if (!draft || tool === "eraser") {
      setDraft(null);
      return;
    }

    if (draft.points.length >= 4 || (draft.kind === "pen" && draft.points.length >= 6)) {
      onAddShape({
        id: crypto.randomUUID(),
        kind: draft.kind,
        color,
        width,
        points: draft.points,
        author: authorName,
        createdAt: Date.now(),
      });
    }

    setDraft(null);
  }

  function handleWheel(event: React.WheelEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const scale = clamp(view.scale * (event.deltaY < 0 ? 1.1 : 1 / 1.1), 0.2, 5);
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;

    onViewChange({
      scale,
      x: pointerX - ((pointerX - view.x) / view.scale) * scale,
      y: pointerY - ((pointerY - view.y) / view.scale) * scale,
    });
  }

  function commitText() {
    const value = textDraft?.value.trim();

    if (textDraft && value) {
      onAddShape({
        id: crypto.randomUUID(),
        kind: "text",
        color,
        width,
        points: [textDraft.x, textDraft.y],
        text: value.slice(0, BOARD_TEXT_MAX_LENGTH),
        author: authorName,
        createdAt: Date.now(),
      });
    }

    setTextDraft(null);
  }

  return (
    <div className="relative size-full overflow-hidden rounded-xl bg-tile">
      <svg
        ref={svgRef}
        className="size-full touch-none"
        style={{ cursor: cursorFor(tool) }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => onCursorMove(null)}
        onWheel={handleWheel}
        aria-label="whiteboard"
      >
        <title>whiteboard</title>

        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
          {shapes.map((shape) => (
            <ShapeNode key={shape.id} shape={shape} />
          ))}

          {draft && tool !== "eraser" ? (
            <ShapeNode
              shape={{
                id: "draft",
                kind: draft.kind,
                color,
                width,
                points: draft.points,
                author: authorName,
                createdAt: 0,
              }}
            />
          ) : null}

          {cursors.map((cursor) => (
            <g key={cursor.clientId} transform={`translate(${cursor.x} ${cursor.y})`}>
              <circle r={4 / view.scale} fill={cursor.color} />
              <text
                x={8 / view.scale}
                y={4 / view.scale}
                fill={cursor.color}
                fontSize={12 / view.scale}
              >
                {cursor.name}
              </text>
            </g>
          ))}
        </g>
      </svg>

      {textDraft ? (
        <input
          // Positioned where the click landed, so text appears where it was asked for.
          style={{
            left: textDraft.x * view.scale + view.x,
            top: textDraft.y * view.scale + view.y - 14,
            color,
            fontSize: 16 * view.scale,
          }}
          className="absolute min-w-40 rounded border border-white/30 bg-black/60 px-1.5 py-0.5 outline-none"
          value={textDraft.value}
          maxLength={BOARD_TEXT_MAX_LENGTH}
          // biome-ignore lint/a11y/noAutofocus: the caret belongs where the person just clicked
          autoFocus
          onChange={(event) => setTextDraft({ ...textDraft, value: event.target.value })}
          onBlur={commitText}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitText();
            } else if (event.key === "Escape") {
              setTextDraft(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

/** Cheap hit test: near any sampled point, or inside the bounding box. */
function shapeHit(shape: BoardShape, point: { x: number; y: number }): boolean {
  if (shape.kind === "pen" || shape.kind === "line") {
    return pairsOf(shape.points).some(
      ([x, y]) => Math.hypot(x - point.x, y - point.y) <= ERASER_RADIUS + shape.width,
    );
  }

  const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = shape.points;

  if (shape.kind === "text") {
    // Text has no second corner; treat it as a small box around its anchor.
    return (
      point.x >= x0 - ERASER_RADIUS &&
      point.x <= x0 + 200 &&
      point.y >= y0 - 20 &&
      point.y <= y0 + ERASER_RADIUS
    );
  }

  return (
    point.x >= Math.min(x0, x1) - ERASER_RADIUS &&
    point.x <= Math.max(x0, x1) + ERASER_RADIUS &&
    point.y >= Math.min(y0, y1) - ERASER_RADIUS &&
    point.y <= Math.max(y0, y1) + ERASER_RADIUS
  );
}

function cursorFor(tool: BoardTool): string {
  switch (tool) {
    case "pan":
      return "grab";
    case "text":
      return "text";
    case "eraser":
      return "cell";
    default:
      return "crosshair";
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
