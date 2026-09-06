"use client";

import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { colorFor, type YjsConnection } from "./use-yjs-doc";

/**
 * Shared meeting notes.
 *
 * The Collaboration extension replaces Tiptap's own history with Yjs' undo
 * manager, which is why StarterKit's undo/redo is switched off: two histories
 * over one document undo each other's work.
 */
export function NotesEditor({
  connection,
  displayName,
}: {
  connection: YjsConnection;
  displayName: string;
}) {
  const t = useTranslations("room");

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: connection.doc, field: "notes" }),
        /*
         * The name has to be given here, not only on the provider.
         *
         * The extension writes its own `user` option into awareness when it
         * starts, and that option defaults to a nameless, colourless object —
         * so whatever the connection had already published was overwritten and
         * every caret was labelled with the raw client id instead of a person.
         */
        CollaborationCaret.configure({
          provider: connection.provider,
          user: { name: displayName, color: colorFor(displayName) },
        }),
      ],
      editorProps: {
        attributes: {
          class:
            "prose-sm max-w-none min-h-full outline-none [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ol]:list-decimal [&_ul,&_ol]:pl-5 [&_p]:my-2 [&_li]:my-0.5",
        },
      },
    },
    [connection.doc, connection.provider, displayName],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5">
        <ToolbarButton
          label={t("notesBold")}
          active={editor?.isActive("bold") ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          Icon={Bold}
        />
        <ToolbarButton
          label={t("notesItalic")}
          active={editor?.isActive("italic") ?? false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          Icon={Italic}
        />
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          label={t("notesBullets")}
          active={editor?.isActive("bulletList") ?? false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          Icon={List}
        />
        <ToolbarButton
          label={t("notesNumbers")}
          active={editor?.isActive("orderedList") ?? false}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          Icon={ListOrdered}
        />
      </div>

      <EditorContent editor={editor} className="min-h-0 flex-1 overflow-y-auto px-5 py-4" />
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  Icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  Icon: typeof Bold;
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
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
