"use client";

import {
  BOARD_COLORS,
  BOARD_STROKE_WIDTHS,
  type BoardColor,
  type BoardTool,
} from "@us-stream/shared";
import {
  Circle,
  Eraser,
  Hand,
  Loader2,
  Minus,
  Pencil,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useWhiteboard } from "./use-whiteboard";
import type { YjsConnection } from "./use-yjs-doc";
import { type ViewTransform, WhiteboardCanvas } from "./whiteboard-canvas";

const TOOLS: { tool: BoardTool; Icon: typeof Pencil; labelKey: string }[] = [
  { tool: "pen", Icon: Pencil, labelKey: "toolPen" },
  { tool: "line", Icon: Minus, labelKey: "toolLine" },
  { tool: "rect", Icon: Square, labelKey: "toolRect" },
  { tool: "ellipse", Icon: Circle, labelKey: "toolEllipse" },
  { tool: "text", Icon: Type, labelKey: "toolText" },
  { tool: "eraser", Icon: Eraser, labelKey: "toolEraser" },
  { tool: "pan", Icon: Hand, labelKey: "toolPan" },
];

export function Whiteboard({
  connection,
  authorName,
}: {
  connection: YjsConnection;
  authorName: string;
}) {
  const t = useTranslations("room");
  const board = useWhiteboard(connection);

  const [tool, setTool] = useState<BoardTool>("pen");
  const [color, setColor] = useState<BoardColor>(BOARD_COLORS[0]);
  const [width, setWidth] = useState<number>(BOARD_STROKE_WIDTHS[1]);
  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center gap-1 rounded-xl border border-border bg-card px-2 py-1.5">
        {TOOLS.map(({ tool: value, Icon, labelKey }) => (
          <ToolButton
            key={value}
            label={t(labelKey as "toolPen")}
            active={tool === value}
            onClick={() => setTool(value)}
            Icon={Icon}
          />
        ))}

        <span className="mx-1 h-5 w-px bg-border" />

        <fieldset className="flex items-center gap-1">
          <legend className="sr-only">{t("boardColor")}</legend>
          {BOARD_COLORS.map((value) => (
            <button
              key={value}
              type="button"
              aria-label={value}
              aria-pressed={color === value}
              onClick={() => setColor(value)}
              style={{ backgroundColor: value }}
              className={cn(
                "size-5 rounded-full transition-transform",
                color === value
                  ? "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-card"
                  : "",
              )}
            />
          ))}
        </fieldset>

        <span className="mx-1 h-5 w-px bg-border" />

        <fieldset className="flex items-center gap-1">
          <legend className="sr-only">{t("boardWidth")}</legend>
          {BOARD_STROKE_WIDTHS.map((value) => (
            <button
              key={value}
              type="button"
              aria-label={String(value)}
              aria-pressed={width === value}
              onClick={() => setWidth(value)}
              className={cn(
                "grid size-7 place-items-center rounded-md transition-colors",
                width === value ? "bg-primary text-primary-foreground" : "hover:bg-accent",
              )}
            >
              <span
                className="rounded-full bg-current"
                style={{ width: Math.min(value, 12), height: Math.min(value, 12) }}
              />
            </button>
          ))}
        </fieldset>

        <span className="mx-1 h-5 w-px bg-border" />

        <ToolButton label={t("boardUndo")} active={false} onClick={board.undo} Icon={Undo2} />
        <ToolButton label={t("boardRedo")} active={false} onClick={board.redo} Icon={Redo2} />

        <ToolButton
          label={t("boardClear")}
          active={false}
          destructive
          onClick={() => {
            if (window.confirm(t("boardClearConfirm"))) {
              board.clearBoard();
            }
          }}
          Icon={Trash2}
        />

        {connection.loading ? (
          <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            {t("boardConnecting")}
          </span>
        ) : null}
      </div>

      <div className="min-h-0 flex-1">
        <WhiteboardCanvas
          shapes={board.shapes}
          cursors={board.cursors}
          tool={tool}
          color={color}
          width={width}
          view={view}
          onViewChange={setView}
          onAddShape={board.addShape}
          onEraseShapes={board.eraseShapes}
          onCursorMove={board.setCursor}
          authorName={authorName}
        />
      </div>
    </div>
  );
}

function ToolButton({
  label,
  active,
  onClick,
  Icon,
  destructive = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  Icon: typeof Pencil;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "grid size-8 place-items-center rounded-md transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : destructive
            ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
