"use client";

import { useParticipants } from "@livekit/components-react";
import { MicOff, Volume2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ParticipantMenu } from "./participant-menu";
import { participantRole, ROLE_LABEL_KEYS } from "./participant-role";

export function ParticipantsPanel({
  onClose,
  canModerate,
  actorOutranks,
  onModerate,
  onMuteEveryone,
}: {
  onClose: () => void;
  canModerate: boolean;
  actorOutranks: (identity: string) => boolean;
  onModerate: (action: "mute" | "remove", identity: string, name: string) => void;
  onMuteEveryone: () => void;
}) {
  const t = useTranslations("room");
  const participants = useParticipants();

  return (
    <aside className="flex h-full w-full flex-col border-l border-border bg-card">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3.5">
        <h2 className="text-sm font-semibold">
          {t("participants")}{" "}
          <span className="tabular text-muted-foreground">{participants.length}</span>
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("participants")}>
          <X />
        </Button>
      </header>

      <ul className="flex-1 overflow-y-auto p-2">
        {participants.map((participant) => {
          const name = participant.name || participant.identity;
          const role = participantRole(participant.metadata);

          return (
            <li
              key={participant.identity}
              className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent"
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold",
                  participant.isSpeaking && "ring-2 ring-signal",
                )}
              >
                {initialsOf(name)}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">
                  {name}
                  {participant.isLocal ? ` (${t("you")})` : ""}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t(ROLE_LABEL_KEYS[role])}
                </span>
              </span>

              {participant.isMicrophoneEnabled ? (
                <Volume2 className="size-4 shrink-0 text-muted-foreground/60" aria-hidden />
              ) : (
                <MicOff className="size-4 shrink-0 text-muted-foreground" aria-label={t("muted")} />
              )}

              {canModerate && !participant.isLocal && actorOutranks(participant.identity) ? (
                <ParticipantMenu
                  name={name}
                  onMute={() => onModerate("mute", participant.identity, name)}
                  onRemove={() => onModerate("remove", participant.identity, name)}
                  triggerClassName="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      {canModerate ? (
        <footer className="border-t border-border p-3">
          <Button variant="outline" size="sm" className="w-full" onClick={onMuteEveryone}>
            <MicOff />
            {t("muteEveryone")}
          </Button>
        </footer>
      ) : null}
    </aside>
  );
}

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
