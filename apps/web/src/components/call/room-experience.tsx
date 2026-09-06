"use client";

import { LiveKitRoom } from "@livekit/components-react";
import type { JoinRoomResponse, Role } from "@us-stream/shared";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Wordmark } from "@/components/wordmark";
import { CallRoom } from "./call-room";
import { PrejoinLobby } from "./prejoin-lobby";
import type { MediaChoices } from "./use-media-preview";
import { useMediaPreview } from "./use-media-preview";

type Phase =
  | { kind: "lobby" }
  | { kind: "waiting" }
  | {
      kind: "connected";
      token: string;
      serverUrl: string;
      role: Role;
      choices: MediaChoices;
      /** The breakout room this participant is in, or `null` for the main one. */
      breakoutLabel: string | null;
      breakoutClosesAt: number | null;
    }
  | { kind: "left" };

/**
 * Everything between opening a room link and being in the call.
 *
 * The lobby, the credentials the room happens to require and the call itself
 * all live under one component because they share the device choices: what
 * someone picks in the preview is exactly what the Room connects with.
 */
export function RoomExperience({
  slug,
  roomTitle,
  requiresPassword,
  knownName,
  initialRole,
  realtimeUrl,
}: {
  slug: string;
  roomTitle: string;
  requiresPassword: boolean;
  knownName: string | null;
  initialRole: Role;
  /** The realtime service, which hosts the whiteboard and the shared notes. */
  realtimeUrl: string;
}) {
  const t = useTranslations("room");
  const preview = useMediaPreview();
  const nameId = useId();
  const passwordId = useId();

  const [phase, setPhase] = useState<Phase>({ kind: "lobby" });
  const [joining, setJoining] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");

  // A host is never asked for their own room's password.
  const askForPassword = requiresPassword && initialRole === "guest";

  const join = useCallback(
    async (choices: MediaChoices) => {
      setJoining(true);
      setErrorKey(null);

      const response = await fetch(`/api/rooms/${slug}/token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: knownName ? null : displayName,
          password: askForPassword ? password : null,
        }),
      }).catch(() => null);

      const payload = (await response?.json().catch(() => null)) as JoinRoomResponse | null;

      if (!payload) {
        setErrorKey("generic");
        setJoining(false);
        return;
      }

      if (payload.status === "waiting") {
        setPhase({ kind: "waiting" });
        setJoining(false);
        return;
      }

      if (payload.status === "rejected") {
        setErrorKey(payload.reason);
        setJoining(false);
        return;
      }

      // Hand the camera over cleanly: the preview must let go before the Room
      // asks for the same device, or one of the two gets nothing.
      preview.release();

      setPhase({
        kind: "connected",
        token: payload.token,
        serverUrl: payload.serverUrl,
        role: payload.role,
        choices,
        breakoutLabel: null,
        breakoutClosesAt: null,
      });
      setJoining(false);
    },
    [slug, knownName, displayName, askForPassword, password, preview],
  );

  /**
   * Being sent into a breakout room, or brought back out of one.
   *
   * Only the token changes; the media choices and everything else about the
   * session stay as they were, so somebody who muted themselves before the
   * split is still muted after it.
   */
  const handleBreakoutMove = useCallback(
    (move: { token: string; label: string | null; closesAt: number | null }) => {
      setPhase((current) =>
        current.kind === "connected"
          ? {
              ...current,
              token: move.token,
              breakoutLabel: move.label,
              breakoutClosesAt: move.closesAt,
            }
          : current,
      );
    },
    [],
  );

  if (phase.kind === "connected") {
    const { choices } = phase;

    return (
      <LiveKitRoom
        /*
         * Keyed by the token so that being moved into a breakout room — or
         * brought back — tears the connection down and builds a new one.
         * Swapping the prop alone leaves the old room's tracks and
         * participants behind for a moment, which reads as a glitch.
         */
        key={phase.token}
        token={phase.token}
        serverUrl={phase.serverUrl}
        connect
        audio={choices.microphoneEnabled}
        video={choices.cameraEnabled}
        options={{
          adaptiveStream: true,
          // Publishes several qualities so each viewer gets what their
          // connection can carry rather than everyone getting the worst.
          dynacast: true,
          videoCaptureDefaults: {
            deviceId: choices.cameraId || undefined,
            // 720p is the ceiling on purpose. Nobody in a small meeting looks
            // better at 1080p, and the extra bitrate is felt by whoever has
            // the worst connection in the room.
            resolution: { width: 1280, height: 720 },
          },
          audioCaptureDefaults: {
            deviceId: choices.microphoneId || undefined,
            // The browser's own processing. Krisp is the alternative and it is
            // billed per minute on LiveKit Cloud.
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: true,
          },
        }}
        onDisconnected={() => setPhase({ kind: "left" })}
        className="contents"
      >
        <CallRoom
          slug={slug}
          roomTitle={roomTitle}
          breakoutLabel={phase.breakoutLabel}
          breakoutClosesAt={phase.breakoutClosesAt}
          myRole={phase.role}
          token={phase.token}
          realtimeUrl={realtimeUrl}
          displayName={knownName ?? displayName}
          /*
           * The live preference, not `phase.choices` — that is the snapshot
           * taken when the call started and would never change again, so the
           * toggle would appear to do nothing.
           */
          blurEnabled={preview.choices.backgroundBlur}
          onToggleBlur={() => preview.update({ backgroundBlur: !preview.choices.backgroundBlur })}
          onBreakoutMove={handleBreakoutMove}
          onLeave={() => setPhase({ kind: "left" })}
        />
      </LiveKitRoom>
    );
  }

  if (phase.kind === "waiting") {
    return (
      <LobbyChrome slug={slug} roomTitle={roomTitle} narrow>
        <Notice title={t("waitingTitle")} body={t("waitingBody")}>
          <Loader2 className="size-5 animate-spin text-signal" />
        </Notice>
      </LobbyChrome>
    );
  }

  if (phase.kind === "left") {
    return (
      <LobbyChrome slug={slug} roomTitle={roomTitle} narrow>
        <Notice title={t("leftTitle")} body={t("leftBody")}>
          <Button onClick={() => setPhase({ kind: "lobby" })}>{t("rejoin")}</Button>
        </Notice>
      </LobbyChrome>
    );
  }

  return (
    <LobbyChrome slug={slug} roomTitle={roomTitle}>
      <PrejoinLobby
        preview={preview}
        joining={joining}
        onJoin={join}
        error={errorKey ? t(`errors.${errorKey}`) : null}
        credentials={
          knownName && !askForPassword ? null : (
            <div className="space-y-4">
              {knownName ? null : (
                <Field label={t("yourName")} htmlFor={nameId}>
                  <Input
                    id={nameId}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    minLength={2}
                    maxLength={40}
                    required
                    autoComplete="nickname"
                    placeholder={t("namePlaceholder")}
                  />
                </Field>
              )}

              {askForPassword ? (
                <Field label={t("password")} htmlFor={passwordId}>
                  <Input
                    id={passwordId}
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="off"
                    required
                  />
                </Field>
              ) : null}
            </div>
          )
        }
      />
    </LobbyChrome>
  );
}

/** The page around the lobby. Dropped entirely once the call takes the screen. */
function LobbyChrome({
  slug,
  roomTitle,
  narrow = false,
  children,
}: {
  slug: string;
  roomTitle: string;
  narrow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="stage-glow flex min-h-dvh flex-col">
      <header className="px-6 py-6 sm:px-10">
        <Link
          href="/"
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Wordmark />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16 sm:px-10">
        <div className={narrow ? "w-full max-w-md" : "w-full max-w-4xl"}>
          <p className="tabular text-xs tracking-[0.14em] text-muted-foreground uppercase">
            {slug}
          </p>
          <h1 className="mt-2 mb-8 text-3xl font-semibold text-balance">{roomTitle}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}

function Notice({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-7">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}
