"use client";

import { useLocalParticipant } from "@livekit/components-react";
import type { ReactionEmoji } from "@us-stream/shared";
import {
  ClipboardList,
  Hand,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ReactionPicker } from "./reaction-picker";

export function ControlBar({
  openPanel,
  onOpenPanel,
  onLeave,
  pushToTalkActive,
  handRaised,
  onToggleHand,
  onReact,
  unreadCount,
}: {
  openPanel: "participants" | "chat" | "engage" | null;
  onOpenPanel: (panel: "participants" | "chat" | "engage" | null) => void;
  onLeave: () => void;
  pushToTalkActive: boolean;
  handRaised: boolean;
  onToggleHand: () => void;
  onReact: (emoji: ReactionEmoji) => void;
  unreadCount: number;
}) {
  const t = useTranslations("room");
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <ControlButton
        active={isMicrophoneEnabled}
        label={isMicrophoneEnabled ? t("micOff") : t("micOn")}
        OnIcon={Mic}
        OffIcon={MicOff}
        pulsing={pushToTalkActive}
        onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
      />

      <ControlButton
        active={isCameraEnabled}
        label={isCameraEnabled ? t("cameraOff") : t("cameraOn")}
        OnIcon={Video}
        OffIcon={VideoOff}
        onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
      />

      <ControlButton
        active={isScreenShareEnabled}
        highlightWhenActive
        label={isScreenShareEnabled ? t("stopScreenShare") : t("screenShare")}
        OnIcon={MonitorUp}
        OffIcon={MonitorUp}
        onClick={() =>
          localParticipant.setScreenShareEnabled(!isScreenShareEnabled, {
            // Sharing a video without its sound is the classic disappointment.
            audio: true,
            contentHint: "detail",
          })
        }
      />

      <ReactionPicker onSelect={onReact} />

      <ControlButton
        active={handRaised}
        highlightWhenActive
        label={handRaised ? t("lowerHand") : t("raiseHand")}
        OnIcon={Hand}
        OffIcon={Hand}
        onClick={onToggleHand}
      />

      <ControlButton
        active={openPanel === "chat"}
        highlightWhenActive
        label={t("chat")}
        OnIcon={MessageSquare}
        OffIcon={MessageSquare}
        badge={unreadCount}
        onClick={() => onOpenPanel(openPanel === "chat" ? null : "chat")}
      />

      <ControlButton
        active={openPanel === "engage"}
        highlightWhenActive
        label={t("polls")}
        OnIcon={ClipboardList}
        OffIcon={ClipboardList}
        onClick={() => onOpenPanel(openPanel === "engage" ? null : "engage")}
      />

      <ControlButton
        active={openPanel === "participants"}
        highlightWhenActive
        label={t("participants")}
        OnIcon={Users}
        OffIcon={Users}
        onClick={() => onOpenPanel(openPanel === "participants" ? null : "participants")}
      />

      <button
        type="button"
        onClick={onLeave}
        aria-label={t("leave")}
        title={t("leave")}
        className="ml-2 grid h-12 place-items-center rounded-full bg-destructive px-6 text-destructive-foreground transition-transform hover:-translate-y-px"
      >
        <PhoneOff className="size-5" />
      </button>
    </div>
  );
}

function ControlButton({
  active,
  label,
  OnIcon,
  OffIcon,
  onClick,
  highlightWhenActive = false,
  pulsing = false,
  badge = 0,
}: {
  active: boolean;
  label: string;
  OnIcon: typeof Mic;
  OffIcon: typeof MicOff;
  onClick: () => void;
  /** For toggles where "on" is an action in progress rather than the norm. */
  highlightWhenActive?: boolean;
  pulsing?: boolean;
  badge?: number;
}) {
  const Icon = active ? OnIcon : OffIcon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "relative grid size-12 place-items-center rounded-full transition-colors",
        highlightWhenActive
          ? active
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-foreground hover:bg-accent"
          : active
            ? "bg-secondary text-foreground hover:bg-accent"
            : "bg-destructive text-destructive-foreground",
        pulsing && "ring-2 ring-signal",
      )}
    >
      <Icon className="size-5" />

      {badge > 0 ? (
        <span className="tabular absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-live px-1 text-[0.625rem] leading-5 text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
}
