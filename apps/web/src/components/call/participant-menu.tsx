"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MicOff, MoreVertical, UserMinus } from "lucide-react";
import { useTranslations } from "next-intl";

/** Host actions on one participant. Only rendered when the actor outranks them. */
export function ParticipantMenu({
  name,
  onMute,
  onRemove,
  triggerClassName = "grid size-8 place-items-center rounded-lg bg-black/50 text-white outline-none transition-colors hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-ring",
}: {
  name: string;
  onMute: () => void;
  onRemove: () => void;
  triggerClassName?: string;
}) {
  const t = useTranslations("room");

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={triggerClassName} aria-label={name}>
        <MoreVertical className="size-4" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-48 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-2xl shadow-black/40"
        >
          <DropdownMenu.Item
            onSelect={onMute}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none data-highlighted:bg-accent"
          >
            <MicOff className="size-4 text-muted-foreground" />
            {t("muteParticipant")}
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={onRemove}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-destructive outline-none data-highlighted:bg-destructive/10"
          >
            <UserMinus className="size-4" />
            {t("removeParticipant")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
