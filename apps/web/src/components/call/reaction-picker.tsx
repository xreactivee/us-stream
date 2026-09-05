"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { REACTION_EMOJIS, type ReactionEmoji } from "@us-stream/shared";
import { Smile } from "lucide-react";
import { useTranslations } from "next-intl";

export function ReactionPicker({ onSelect }: { onSelect: (emoji: ReactionEmoji) => void }) {
  const t = useTranslations("room");

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t("react")}
        title={t("react")}
        className="grid size-12 place-items-center rounded-full bg-secondary text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Smile className="size-5" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          sideOffset={10}
          className="z-50 flex gap-1 rounded-2xl border border-border bg-popover p-2 shadow-2xl shadow-black/40"
        >
          {REACTION_EMOJIS.map((emoji) => (
            <DropdownMenu.Item
              key={emoji}
              onSelect={() => onSelect(emoji)}
              aria-label={emoji}
              className="grid size-10 cursor-pointer place-items-center rounded-xl text-xl outline-none transition-transform data-highlighted:scale-125 data-highlighted:bg-accent"
            >
              {emoji}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
