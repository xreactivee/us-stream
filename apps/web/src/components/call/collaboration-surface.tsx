"use client";

import type { DocKind } from "@us-stream/shared";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { NotesEditor } from "./notes-editor";
import { useYjsDoc } from "./use-yjs-doc";
import { Whiteboard } from "./whiteboard";

/**
 * Mounts one collaborative document while its tab is on screen.
 *
 * The connection lives and dies with the tab on purpose: leaving it open would
 * keep a cursor on other people's boards for someone who is looking at
 * something else, and the document itself is safe either way because the
 * server holds it and writes snapshots.
 */
export function CollaborationSurface({
  kind,
  token,
  realtimeUrl,
  displayName,
}: {
  kind: DocKind;
  token: string;
  realtimeUrl: string;
  displayName: string;
}) {
  const t = useTranslations("room");
  const connection = useYjsDoc({ kind, token, serverUrl: realtimeUrl, displayName });

  if (!connection) {
    return (
      <div className="grid h-full place-items-center rounded-xl border border-border bg-card">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t("boardConnecting")}
        </span>
      </div>
    );
  }

  return kind === "whiteboard" ? (
    <Whiteboard connection={connection} authorName={displayName} />
  ) : (
    <NotesEditor connection={connection} />
  );
}
