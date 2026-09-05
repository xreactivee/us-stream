/**
 * The whiteboard's document shape.
 *
 * Kept in the shared package because both ends read it: the browser draws from
 * it, and anything server-side that later needs to render a thumbnail or an
 * export has to understand the same records.
 *
 * Every shape is one entry in a `Y.Map` keyed by id rather than an entry in a
 * list. Two people drawing at once then touch different keys and never
 * conflict, and erasing is a delete rather than a splice that would renumber
 * everything after it.
 */

export const BOARD_TOOLS = ["pen", "line", "rect", "ellipse", "text", "eraser", "pan"] as const;
export type BoardTool = (typeof BOARD_TOOLS)[number];

/** Tools that leave something behind. `eraser` and `pan` do not. */
export const BOARD_SHAPE_KINDS = ["pen", "line", "rect", "ellipse", "text"] as const;
export type BoardShapeKind = (typeof BOARD_SHAPE_KINDS)[number];

export const BOARD_COLORS = [
  "#e8e6e1", // chalk
  "#f2a63b", // signal amber
  "#e0533d", // coral
  "#4fb286", // mint
  "#5b8dd9", // blue
  "#b07cd6", // violet
] as const;
export type BoardColor = (typeof BOARD_COLORS)[number];

export const BOARD_STROKE_WIDTHS = [2, 4, 8, 16] as const;

export const BOARD_TEXT_MAX_LENGTH = 400;

export interface BoardShape {
  id: string;
  kind: BoardShapeKind;
  color: string;
  width: number;
  /**
   * Flat `[x0, y0, x1, y1, …]` in board coordinates.
   *
   * A pen stroke holds every sampled point; a line, rectangle or ellipse holds
   * exactly two — its start and end corner. Flat numbers rather than objects
   * because a long stroke is thousands of points and `{x, y}` pairs triple the
   * size of the update that has to reach everyone.
   */
  points: number[];
  /** Only for `text`. */
  text?: string;
  /** Who drew it, for attribution. Never used for permission. */
  author: string;
  createdAt: number;
}

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
