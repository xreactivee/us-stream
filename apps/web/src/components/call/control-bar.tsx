"use client";

import { useLocalParticipant } from "@livekit/components-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ReactionEmoji } from "@us-stream/shared";
import {
  ClipboardList,
  Hand,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  MoreHorizontal,
  PhoneOff,
  PictureInPicture2,
  Sparkles,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { ReactionPicker } from "./reaction-picker";

type Panel = "participants" | "chat" | "engage" | null;
type IconComponent = ComponentType<{ className?: string }>;

interface SecondaryAction {
  key: string;
  label: string;
  Icon: IconComponent;
  active: boolean;
  badge?: number;
  onSelect: () => void;
}

export function ControlBar({
  openPanel,
  onOpenPanel,
  onLeave,
  pushToTalkActive,
  handRaised,
  onToggleHand,
  onReact,
  unreadCount,
  blurEnabled,
  blurSupported,
  onToggleBlur,
  pipSupported,
  pipOpen,
  onTogglePip,
}: {
  openPanel: Panel;
  onOpenPanel: (panel: Panel) => void;
  onLeave: () => void;
  pushToTalkActive: boolean;
  handRaised: boolean;
  onToggleHand: () => void;
  onReact: (emoji: ReactionEmoji) => void;
  unreadCount: number;
  blurEnabled: boolean;
  blurSupported: boolean;
  onToggleBlur: () => void;
  pipSupported: boolean;
  pipOpen: boolean;
  onTogglePip: () => void;
}) {
  const t = useTranslations("room");
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();

  /*
   * Everything except the microphone, the camera and the way out. On a phone
   * these collapse into one menu rather than wrapping onto a second row that
   * would eat into the video.
   */
  const secondary: SecondaryAction[] = [
    {
      key: "screen",
      label: isScreenShareEnabled ? t("stopScreenShare") : t("screenShare"),
      Icon: MonitorUp,
      active: isScreenShareEnabled,
      onSelect: () =>
        void localParticipant.setScreenShareEnabled(!isScreenShareEnabled, {
          // Sharing a video without its sound is the classic disappointment.
          audio: true,
          contentHint: "detail",
        }),
    },
    {
      key: "hand",
      label: handRaised ? t("lowerHand") : t("raiseHand"),
      Icon: Hand,
      active: handRaised,
      onSelect: onToggleHand,
    },
    {
      key: "chat",
      label: t("chat"),
      Icon: MessageSquare,
      active: openPanel === "chat",
      badge: unreadCount,
      onSelect: () => onOpenPanel(openPanel === "chat" ? null : "chat"),
    },
    {
      key: "engage",
      label: t("polls"),
      Icon: ClipboardList,
      active: openPanel === "engage",
      onSelect: () => onOpenPanel(openPanel === "engage" ? null : "engage"),
    },
    {
      key: "participants",
      label: t("participants"),
      Icon: Users,
      active: openPanel === "participants",
      onSelect: () => onOpenPanel(openPanel === "participants" ? null : "participants"),
    },
    // Both of the following are dropped entirely where the browser cannot do
    // them: an offer that silently fails is worse than no offer.
    ...(blurSupported
      ? [
          {
            key: "blur",
            label: blurEnabled ? t("blurOff") : t("blurOn"),
            Icon: Sparkles as IconComponent,
            active: blurEnabled,
            onSelect: onToggleBlur,
          },
        ]
      : []),
    ...(pipSupported
      ? [
          {
            key: "pip",
            label: pipOpen ? t("pipClose") : t("pipOpen"),
            Icon: PictureInPicture2 as IconComponent,
            active: pipOpen,
            onSelect: onTogglePip,
          },
        ]
      : []),
  ];

  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
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

      <div className="hidden items-center gap-2 sm:flex">
        <ReactionPicker onSelect={onReact} />

        {secondary.map((action) => (
          <ControlButton
            key={action.key}
            active={action.active}
            highlightWhenActive
            label={action.label}
            OnIcon={action.Icon}
            OffIcon={action.Icon}
            badge={action.badge}
            onClick={action.onSelect}
          />
        ))}
      </div>

      {/* The same actions, one tap away, on a narrow screen. */}
      <div className="sm:hidden">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            aria-label={t("moreControls")}
            className="grid size-11 place-items-center rounded-full bg-secondary text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MoreHorizontal className="size-5" />
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="center"
              side="top"
              sideOffset={8}
              className="z-50 min-w-52 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-2xl shadow-black/40"
            >
              {secondary.map((action) => (
                <DropdownMenu.Item
                  key={action.key}
                  onSelect={action.onSelect}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none data-highlighted:bg-accent",
                    action.active && "text-primary",
                  )}
                >
                  <action.Icon className="size-4" />
                  {action.label}
                  {action.badge && action.badge > 0 ? (
                    <span className="tabular ml-auto rounded-full bg-live px-1.5 text-[0.625rem] text-white">
                      {action.badge > 99 ? "99+" : action.badge}
                    </span>
                  ) : null}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <button
        type="button"
        onClick={onLeave}
        aria-label={t("leave")}
        title={t("leave")}
        className="ml-1 grid h-11 place-items-center rounded-full bg-destructive px-5 text-destructive-foreground transition-transform hover:-translate-y-px sm:ml-2 sm:h-12 sm:px-6"
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
  OnIcon: IconComponent;
  OffIcon: IconComponent;
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
        "relative grid size-11 place-items-center rounded-full transition-colors sm:size-12",
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
