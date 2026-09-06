"use client";

import { Loader2, Mic, MicOff, Sparkles, Video, VideoOff } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DeviceSelect } from "./device-select";
import type { MediaChoices, useMediaPreview } from "./use-media-preview";

export function PrejoinLobby({
  preview,
  joining,
  onJoin,
  credentials,
  error,
}: {
  preview: ReturnType<typeof useMediaPreview>;
  joining: boolean;
  onJoin: (choices: MediaChoices) => void;

  credentials?: ReactNode;
  error?: string | null;
}) {
  const t = useTranslations("room");
  const { choices, update, permission, audioLevel, videoRef } = preview;

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <div className="space-y-4">
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "size-full scale-x-[-1] object-cover transition-opacity",
              choices.cameraEnabled && permission === "granted" ? "opacity-100" : "opacity-0",
            )}
          />

          {!choices.cameraEnabled || permission !== "granted" ? (
            <div className="absolute inset-0 grid place-items-center">
              <span className="flex items-center gap-2.5 text-sm text-white/60">
                <VideoOff className="size-4" />
                {t("cameraDisabled")}
              </span>
            </div>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-4">
            <ToggleButton
              on={choices.microphoneEnabled}
              onLabel={t("micOff")}
              offLabel={t("micOn")}
              OnIcon={Mic}
              OffIcon={MicOff}
              onClick={() => update({ microphoneEnabled: !choices.microphoneEnabled })}
            />
            <ToggleButton
              on={choices.cameraEnabled}
              onLabel={t("cameraOff")}
              offLabel={t("cameraOn")}
              OnIcon={Video}
              OffIcon={VideoOff}
              onClick={() => update({ cameraEnabled: !choices.cameraEnabled })}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Mic
            className={cn(
              "size-4 shrink-0",
              choices.microphoneEnabled ? "text-muted-foreground" : "text-muted-foreground/40",
            )}
            aria-hidden
          />
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-connected transition-[width] duration-75"
              style={{ width: `${Math.min(100, Math.round(audioLevel * 140))}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <header>
          <h2 className="font-display text-xl font-semibold">{t("lobbyTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("lobbySubtitle")}</p>
        </header>

        {permission === "denied" ? (
          <div className="rounded-xl border border-degraded/40 bg-degraded/10 p-4">
            <p className="text-sm font-medium">{t("permissionDeniedTitle")}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">{t("permissionDeniedBody")}</p>
          </div>
        ) : (
          <>
            <DeviceSelect
              label={t("camera")}
              devices={preview.cameras}
              value={choices.cameraId}
              onChange={(cameraId) => update({ cameraId })}
              emptyLabel={t("noDevice")}
            />
            <DeviceSelect
              label={t("microphone")}
              devices={preview.microphones}
              value={choices.microphoneId}
              onChange={(microphoneId) => update({ microphoneId })}
              emptyLabel={t("noDevice")}
            />
            {preview.speakers.length > 0 ? (
              <DeviceSelect
                label={t("speaker")}
                devices={preview.speakers}
                value={choices.speakerId}
                onChange={(speakerId) => update({ speakerId })}
                emptyLabel={t("noDevice")}
              />
            ) : null}
          </>
        )}

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
          <input
            type="checkbox"
            checked={choices.backgroundBlur}
            onChange={(event) => update({ backgroundBlur: event.target.checked })}
            className="mt-0.5"
          />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="size-3.5 text-signal" aria-hidden />
              {t("blurOn")}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{t("blurLobbyHint")}</span>
          </span>
        </label>

        {credentials}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button size="lg" className="w-full" disabled={joining} onClick={() => onJoin(choices)}>
          {joining ? <Loader2 className="animate-spin" /> : null}
          {joining ? t("joining") : t("joinNow")}
        </Button>
      </div>
    </div>
  );
}

function ToggleButton({
  on,
  onLabel,
  offLabel,
  OnIcon,
  OffIcon,
  onClick,
}: {
  on: boolean;
  onLabel: string;
  offLabel: string;
  OnIcon: typeof Mic;
  OffIcon: typeof MicOff;
  onClick: () => void;
}) {
  const Icon = on ? OnIcon : OffIcon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={on ? onLabel : offLabel}
      title={on ? onLabel : offLabel}
      className={cn(
        "grid size-11 place-items-center rounded-full transition-colors",
        on
          ? "bg-white/15 text-white hover:bg-white/25"
          : "bg-destructive text-destructive-foreground",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}
