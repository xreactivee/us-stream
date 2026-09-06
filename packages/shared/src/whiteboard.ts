import type { BoardShape } from "./types";

export const BOARD_TOOLS = ["pen", "line", "rect", "ellipse", "text", "eraser", "pan"] as const;

export const BOARD_SHAPE_KINDS = ["pen", "line", "rect", "ellipse", "text"] as const;

export const BOARD_COLORS = [
  "#e8e6e1",
  "#f2a63b",
  "#e0533d",
  "#4fb286",
  "#5b8dd9",
  "#b07cd6",
] as const;

export const BOARD_STROKE_WIDTHS = [2, 4, 8, 16] as const;

export const BOARD_TEXT_MAX_LENGTH = 400;

export function isBoardShape(value: unknown): value is BoardShape {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const shape = value as Partial<BoardShape>;

  return (
    typeof shape.id === "string" &&
    typeof shape.kind === "string" &&
    (BOARD_SHAPE_KINDS as readonly string[]).includes(shape.kind) &&
    typeof shape.color === "string" &&
    typeof shape.width === "number" &&
    Array.isArray(shape.points) &&
    shape.points.every((point) => typeof point === "number" && Number.isFinite(point))
  );
}
