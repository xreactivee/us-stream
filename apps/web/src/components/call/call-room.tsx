"use client";

import {
  RoomAudioRenderer,
  StartAudio,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
} from "@livekit/components-react";
import { hasAuthority, type Role } from "@us-stream/shared";
import { ConnectionState } from "livekit-client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { CallStage } from "./call-stage";
import { ControlBar } from "./control-bar";
import { participantRole } from "./participant-role";
import { ParticipantsPanel } from "./participants-panel";
import { useCallShortcuts } from "./use-call-shortcuts";

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export function CallRoom({
  slug,
  roomTitle,
  myRole,
  onLeave,
}: {
  slug: string;
  roomTitle: string;
  myRole: Role;
  onLeave: () => void;
}) {
  const t = useTranslations("room");
  const connectionState = useConnectionState();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const [panelOpen, setPanelOpen] = useState(false);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  const togglePanel = useCallback(() => setPanelOpen((open) => !open), []);
  const { pushToTalkActive } = useCallShortcuts({ onTogglePanel: togglePanel });

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const canModerate = hasAuthority(myRole, "cohost");

  /**
   * Whether the local participant may act on someone. The server checks this
   * again before doing anything — this only decides whether the menu is worth
   * showing.
   */
  const actorOutranks = useCallback(
    (identity: string) => {
      const target = participants.find((participant) => participant.identity === identity);
      const targetRole = participantRole(target?.metadata);
      const rank: Record<Role, number> = { owner: 3, cohost: 2, member: 1, guest: 0 };

      return rank[myRole] > rank[targetRole];
    },
    [participants, myRole],
  );

  const moderate = useCallback(
    async (action: "mute" | "remove", identity: string, name: string) => {
      if (action === "remove" && !window.confirm(t("removeConfirm", { name }))) {
        return;
      }

      await fetch(`/api/rooms/${slug}/moderate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, targetIdentity: identity }),
      });
    },
    [slug, t],
  );

  const muteEveryone = useCallback(async () => {
    await fetch(`/api/rooms/${slug}/moderate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "muteAll" }),
    });
  }, [slug]);

  const status = useMemo(() => {
    if (connectionState === ConnectionState.Reconnecting) {
      return { label: t("reconnecting"), tone: "degraded" as const };
    }
    if (connectionState === ConnectionState.Disconnected) {
      return { label: t("disconnected"), tone: "live" as const };
    }
    return null;
  }, [connectionState, t]);

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Plays every remote audio track. Without it a call is silent. */}
      <RoomAudioRenderer />

      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              connectionState === ConnectionState.Connected
                ? "bg-signal [animation:var(--animate-on-air)]"
                : "bg-degraded",
            )}
            aria-hidden
          />
          <h1 className="truncate text-sm font-medium">{roomTitle}</h1>
          <span className="tabular shrink-0 text-xs text-muted-foreground">
            {formatElapsed(elapsed)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {status ? (
            <span
              className={cn(
                "rounded-md px-2 py-1 text-xs",
                status.tone === "degraded"
                  ? "bg-degraded/15 text-degraded"
                  : "bg-destructive/15 text-destructive",
              )}
            >
              {status.label}
            </span>
          ) : null}
          <span className="tabular hidden text-xs text-muted-foreground sm:inline">
            {participants.length}
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 p-3">
          <CallStage
            pinnedKey={pinnedKey}
            onTogglePin={setPinnedKey}
            canModerate={canModerate}
            actorOutranks={actorOutranks}
            onModerate={moderate}
          />
        </main>

        {panelOpen ? (
          <div className="w-72 shrink-0">
            <ParticipantsPanel
              onClose={() => setPanelOpen(false)}
              canModerate={canModerate}
              actorOutranks={actorOutranks}
              onModerate={moderate}
              onMuteEveryone={muteEveryone}
            />
          </div>
        ) : null}
      </div>

      <footer className="shrink-0 space-y-2 border-t border-border px-4 py-4">
        <ControlBar
          panelOpen={panelOpen}
          onTogglePanel={togglePanel}
          onLeave={() => {
            void localParticipant.setScreenShareEnabled(false);
            onLeave();
          }}
          pushToTalkActive={pushToTalkActive}
        />
        <p className="hidden text-center text-[0.6875rem] text-muted-foreground md:block">
          {t("shortcuts")} · {t("pushToTalkHint")}
        </p>
      </footer>

      {/* Browsers block autoplaying audio until someone interacts; this is the
          button that unblocks it, and it hides itself when it is not needed. */}
      <StartAudio label="" className="sr-only" />
    </div>
  );
}
