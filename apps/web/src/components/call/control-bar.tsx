"use client";

import { useLocalParticipant } from "@livekit/components-react";
import { Mic, MicOff, MonitorUp, PhoneOff, Users, Video, VideoOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function ControlBar({
  panelOpen,
  onTogglePanel,
  onLeave,
  pushToTalkActive,
}: {
  panelOpen: boolean;
  onTogglePanel: () => void;
  onLeave: () => void;
  pushToTalkActive: boolean;
}) {
  const t = useTranslations("room");
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();

  return (
    <div className="flex items-center justify-center gap-2">
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

      <ControlButton
        active={panelOpen}
        highlightWhenActive
        label={t("participants")}
        OnIcon={Users}
        OffIcon={Users}
        onClick={onTogglePanel}
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
}: {
  active: boolean;
  label: string;
  OnIcon: typeof Mic;
  OffIcon: typeof MicOff;
  onClick: () => void;
  /** For toggles where "on" is an action in progress rather than the norm. */
  highlightWhenActive?: boolean;
  pulsing?: boolean;
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
        "grid size-12 place-items-center rounded-full transition-colors",
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
    </button>
  );
}
