"use client";

import { useParticipants } from "@livekit/components-react";
import { Hand, MicOff, Volume2, X } from "lucide-react";
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
  handQueue,
}: {
  onClose: () => void;
  canModerate: boolean;
  actorOutranks: (identity: string) => boolean;
  onModerate: (action: "mute" | "remove", identity: string, name: string) => void;
  onMuteEveryone: () => void;
  /** Identities with a raised hand, oldest first. */
  handQueue: string[];
}) {
  const t = useTranslations("room");
  const participants = useParticipants();

  // People with a hand up come first, in the order they raised it. Everyone
  // else keeps LiveKit's ordering.
  const ordered = [...participants].sort((a, b) => {
    const aPlace = handQueue.indexOf(a.identity);
    const bPlace = handQueue.indexOf(b.identity);

    if (aPlace === bPlace) return 0;
    if (aPlace === -1) return 1;
    if (bPlace === -1) return -1;

    return aPlace - bPlace;
  });

  return (
    <aside className="flex h-full w-full flex-col">
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
        {ordered.map((participant) => {
          const name = participant.name || participant.identity;
          const role = participantRole(participant.metadata);
          const queuePlace = handQueue.indexOf(participant.identity);

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

              {queuePlace >= 0 ? (
                <span
                  className="tabular flex shrink-0 items-center gap-1 rounded-md bg-signal/15 px-1.5 py-0.5 text-[0.625rem] text-signal"
                  title={t("handQueue")}
                >
                  <Hand className="size-3" aria-hidden />
                  {queuePlace + 1}
                </span>
              ) : null}

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
