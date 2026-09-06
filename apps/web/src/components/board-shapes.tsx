import type { BoardShape } from "@us-stream/shared";

export function pairsOf(points: number[]): [number, number][] {
  const pairs: [number, number][] = [];

  for (let index = 0; index + 1 < points.length; index += 2) {
    pairs.push([points[index] as number, points[index + 1] as number]);
  }

  return pairs;
}

export function ShapeNode({ shape }: { shape: BoardShape }) {
  const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = shape.points;
  const common = {
    stroke: shape.color,
    strokeWidth: shape.width,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  switch (shape.kind) {
    case "pen":
      return (
        <polyline
          points={pairsOf(shape.points)
            .map(([x, y]) => `${x},${y}`)
            .join(" ")}
          {...common}
        />
      );

    case "line":
      return <line x1={x0} y1={y0} x2={x1} y2={y1} {...common} />;

    case "rect":
      return (
        <rect
          x={Math.min(x0, x1)}
          y={Math.min(y0, y1)}
          width={Math.abs(x1 - x0)}
          height={Math.abs(y1 - y0)}
          rx={4}
          {...common}
        />
      );

    case "ellipse":
      return (
        <ellipse
          cx={(x0 + x1) / 2}
          cy={(y0 + y1) / 2}
          rx={Math.abs(x1 - x0) / 2}
          ry={Math.abs(y1 - y0) / 2}
          {...common}
        />
      );

    case "text":
      return (
        <text x={x0} y={y0} fill={shape.color} fontSize={16} stroke="none">
          {shape.text}
        </text>
      );

    default:
      return null;
  }
}

/**
 * The bounding box of everything drawn, padded a little.
 *
 * A board is an unbounded plane, so a still of it has to be framed. Fitting to
 * the drawing rather than to a fixed origin means a board someone panned far
 * from the centre still shows up.
 */
export function boundsOf(shapes: BoardShape[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (shapes.length === 0) {
    return { x: 0, y: 0, width: 800, height: 450 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const shape of shapes) {
    for (const [x, y] of pairsOf(shape.points)) {
      minX = Math.min(minX, x - shape.width);
      minY = Math.min(minY, y - shape.width);
      maxX = Math.max(maxX, x + shape.width);
      maxY = Math.max(maxY, y + shape.width);
    }
  }

  const padding = 24;

  return {
    x: minX - padding,
    y: minY - padding,
    width: Math.max(1, maxX - minX + padding * 2),
    height: Math.max(1, maxY - minY + padding * 2),
  };
}
