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
import { Hand } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CallStage } from "./call-stage";
import { ChatPanel } from "./chat-panel";
import { CollaborationSurface } from "./collaboration-surface";
import { ControlBar } from "./control-bar";
import { participantRole } from "./participant-role";
import { ParticipantsPanel } from "./participants-panel";
import { ReactionsOverlay } from "./reactions-overlay";
import { useCallShortcuts } from "./use-call-shortcuts";
import { useRoomEvents } from "./use-room-events";

type Panel = "participants" | "chat" | null;
type StageMode = "video" | "whiteboard" | "notes";

const STAGE_MODES: { mode: StageMode; labelKey: "stageVideo" | "stageBoard" | "stageNotes" }[] = [
  { mode: "video", labelKey: "stageVideo" },
  { mode: "whiteboard", labelKey: "stageBoard" },
  { mode: "notes", labelKey: "stageNotes" },
];

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
  token,
  realtimeUrl,
  displayName,
  onLeave,
}: {
  slug: string;
  roomTitle: string;
  myRole: Role;
  /** Reused as the credential for the collaborative documents. */
  token: string;
  realtimeUrl: string;
  displayName: string;
  onLeave: () => void;
}) {
  const t = useTranslations("room");
  const connectionState = useConnectionState();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const events = useRoomEvents({ slug });

  const stageGroup = useId();
  const [stage, setStage] = useState<StageMode>("video");
  const [panel, setPanel] = useState<Panel>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const [privateTo, setPrivateTo] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [unread, setUnread] = useState(0);
  const seenCount = useRef(0);

  const { pushToTalkActive } = useCallShortcuts({ onOpenPanel: setPanel });

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  // Unread is simply "arrived while the chat was not on screen".
  useEffect(() => {
    if (panel === "chat") {
      seenCount.current = events.messages.length;
      setUnread(0);
      return;
    }

    setUnread(Math.max(0, events.messages.length - seenCount.current));
  }, [events.messages.length, panel]);

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

  const firstInQueue = events.handQueue[0];
  const firstInQueueName = firstInQueue
    ? (participants.find((participant) => participant.identity === firstInQueue)?.name ??
      firstInQueue)
    : null;

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

        {/* Native radios so the browser supplies arrow-key navigation and the
            group semantics a screen reader expects. */}
        <fieldset className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
          <legend className="sr-only">{t("stageLabel")}</legend>
          {STAGE_MODES.map(({ mode, labelKey }) => (
            <label
              key={mode}
              className="cursor-pointer rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring"
            >
              <input
                type="radio"
                name={stageGroup}
                value={mode}
                checked={stage === mode}
                onChange={() => setStage(mode)}
                className="sr-only"
              />
              {t(labelKey)}
            </label>
          ))}
        </fieldset>

        <div className="flex items-center gap-3">
          {firstInQueueName ? (
            <span className="flex items-center gap-1.5 rounded-md bg-signal/15 px-2 py-1 text-xs text-signal">
              <Hand className="size-3.5" aria-hidden />
              <span className="max-w-32 truncate">{firstInQueueName}</span>
              {events.handQueue.length > 1 ? (
                <span className="tabular">+{events.handQueue.length - 1}</span>
              ) : null}
            </span>
          ) : null}

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
        <main className="relative flex min-w-0 flex-1 flex-col gap-3 p-3">
          {stage === "video" ? (
            <CallStage
              pinnedKey={pinnedKey}
              onTogglePin={setPinnedKey}
              canModerate={canModerate}
              actorOutranks={actorOutranks}
              onModerate={moderate}
            />
          ) : (
            <>
              <div className="min-h-0 flex-1">
                <CollaborationSurface
                  kind={stage === "whiteboard" ? "whiteboard" : "notes"}
                  token={token}
                  realtimeUrl={realtimeUrl}
                  displayName={displayName}
                />
              </div>

              {/* Faces stay along the bottom rather than disappearing: people
                  are still talking while they draw. */}
              <div className="h-28 shrink-0">
                <CallStage
                  layout="strip"
                  pinnedKey={null}
                  onTogglePin={() => setStage("video")}
                  canModerate={canModerate}
                  actorOutranks={actorOutranks}
                  onModerate={moderate}
                />
              </div>
            </>
          )}

          <ReactionsOverlay reactions={events.reactions} />
        </main>

        {panel ? (
          <div className="flex w-80 shrink-0 flex-col border-l border-border bg-card">
            {panel === "participants" ? (
              <ParticipantsPanel
                onClose={() => setPanel(null)}
                canModerate={canModerate}
                actorOutranks={actorOutranks}
                onModerate={moderate}
                onMuteEveryone={muteEveryone}
                handQueue={events.handQueue}
              />
            ) : (
              <>
                <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3.5">
                  <h2 className="text-sm font-semibold">{t("chat")}</h2>
                </header>
                <div className="min-h-0 flex-1">
                  <ChatPanel
                    messages={events.messages}
                    localIdentity={localParticipant.identity}
                    privateTo={privateTo}
                    onSetPrivateTo={setPrivateTo}
                    onSend={(body, toIdentity) => void events.sendMessage(body, toIdentity)}
                  />
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      <footer className="shrink-0 space-y-2 border-t border-border px-4 py-4">
        <ControlBar
          openPanel={panel}
          onOpenPanel={setPanel}
          onLeave={() => {
            void localParticipant.setScreenShareEnabled(false);
            onLeave();
          }}
          pushToTalkActive={pushToTalkActive}
          handRaised={events.handRaised}
          onToggleHand={() => void events.toggleHand()}
          onReact={(emoji) => void events.sendReaction(emoji)}
          unreadCount={unread}
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
