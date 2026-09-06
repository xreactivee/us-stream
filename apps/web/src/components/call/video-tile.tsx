"use client";

import {
  isTrackReference,
  type TrackReferenceOrPlaceholder,
  useIsSpeaking,
  VideoTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { MicOff, Pin, PinOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ParticipantMenu } from "./participant-menu";
import { participantRole, ROLE_LABEL_KEYS } from "./participant-role";

export function VideoTile({
  trackRef,
  isPinned,
  onTogglePin,
  canModerate,
  actorOutranks,
  onModerate,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  isPinned: boolean;
  onTogglePin: () => void;
  canModerate: boolean;
  actorOutranks: (identity: string) => boolean;
  onModerate: (action: "mute" | "remove", identity: string, name: string) => void;
}) {
  const t = useTranslations("room");
  const participant = trackRef.participant;
  const speaking = useIsSpeaking(participant);

  const isScreenShare = trackRef.source === Track.Source.ScreenShare;
  const hasVideo = isTrackReference(trackRef) && !trackRef.publication.isMuted;
  const micMuted = !participant.isMicrophoneEnabled;
  const name = participant.name || participant.identity;
  const role = participantRole(participant.metadata);

  return (
    <div
      className={cn(
        "@container group relative overflow-hidden rounded-xl bg-tile text-tile-foreground transition-shadow",

        "h-full",

        speaking && !isScreenShare
          ? "shadow-[inset_0_0_0_2px_var(--signal)]"
          : "shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]",
      )}
    >
      {hasVideo ? (
        <VideoTrack
          trackRef={trackRef}
          className={cn(
            "size-full",

            isScreenShare ? "object-contain" : "object-cover",

            !isScreenShare && participant.isLocal && "scale-x-[-1]",
          )}
        />
      ) : (
        <div className="grid size-full place-items-center">
          <span className="grid size-10 place-items-center rounded-full bg-white/10 font-display text-sm font-semibold @[16rem]:size-16 @[16rem]:text-xl">
            {initialsOf(name)}
          </span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
        <span className="flex min-w-0 items-center gap-2 text-sm text-white">
          {micMuted && !isScreenShare ? (
            <MicOff className="size-3.5 shrink-0 text-white/70" aria-label={t("muted")} />
          ) : null}
          <span className="truncate">
            {name}
            {participant.isLocal ? ` (${t("you")})` : ""}
          </span>
          {isScreenShare ? (
            <span className="shrink-0 text-xs text-white/60">· {t("sharing")}</span>
          ) : null}
        </span>

        <span className="shrink-0 text-[0.625rem] tracking-[0.08em] text-white/50 uppercase">
          {t(ROLE_LABEL_KEYS[role])}
        </span>
      </div>

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={isPinned ? t("unpin") : t("pin")}
          title={isPinned ? t("unpin") : t("pin")}
          onClick={onTogglePin}
          className="size-8 bg-black/50 text-white hover:bg-black/70"
        >
          {isPinned ? <PinOff /> : <Pin />}
        </Button>

        {canModerate && !participant.isLocal && actorOutranks(participant.identity) ? (
          <ParticipantMenu
            name={name}
            onMute={() => onModerate("mute", participant.identity, name)}
            onRemove={() => onModerate("remove", participant.identity, name)}
          />
        ) : null}
      </div>
    </div>
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
