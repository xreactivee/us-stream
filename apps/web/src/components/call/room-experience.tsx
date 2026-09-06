"use client";

import { LiveKitRoom } from "@livekit/components-react";
import {
  DISPLAY_NAME_MIN_LENGTH,
  type JoinRoomResponse,
  joinRoomResponseSchema,
  type Role,
} from "@us-stream/shared";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Wordmark } from "@/components/wordmark";
import { CallRoom } from "./call-room";
import { PrejoinLobby } from "./prejoin-lobby";
import type { MediaChoices } from "./use-media-preview";
import { useMediaPreview } from "./use-media-preview";

type Phase =
  | { kind: "lobby" }
  | { kind: "waiting"; choices: MediaChoices }
  | {
      kind: "connected";
      token: string;
      serverUrl: string;
      role: Role;
      choices: MediaChoices;
    }
  | { kind: "left" };

/** How often someone held in the waiting room asks whether they are in yet. */
const ADMISSION_POLL_MS = 3000;

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
  const askForName = !knownName;

  const join = useCallback(
    async (choices: MediaChoices) => {
      /*
       * Answered here, before the request, so the message lands the instant
       * the button is pressed rather than after a round trip.
       */
      if (askForName && displayName.trim().length < DISPLAY_NAME_MIN_LENGTH) {
        setErrorKey("name_required");
        return;
      }

      if (askForPassword && password.length === 0) {
        setErrorKey("password_required");
        return;
      }

      setJoining(true);
      setErrorKey(null);

      const response = await fetch(`/api/rooms/${slug}/token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: knownName ? null : displayName.trim(),
          password: askForPassword ? password : null,
        }),
      }).catch(() => null);

      /*
       * Validated rather than trusted.
       *
       * This used to read `payload.status` off whatever came back, so every
       * response that was not one of the three expected shapes — a validation
       * failure, a 404, a proxy's error page — fell through to the "connected"
       * branch and built a Room around an undefined token. What that looks
       * like is the call opening normally and then saying it lost its
       * connection, which is the least informative version of every error at
       * once.
       */
      const parsed = joinRoomResponseSchema.safeParse(await response?.json().catch(() => null));

      setJoining(false);

      if (!parsed.success) {
        setErrorKey("generic");
        return;
      }

      const payload: JoinRoomResponse = parsed.data;

      if (payload.status === "waiting") {
        // Kept identical while the answer is unchanged, so the poll below is
        // not torn down and rebuilt on every tick.
        setPhase((current) =>
          current.kind === "waiting" ? current : { kind: "waiting", choices },
        );
        return;
      }

      if (payload.status === "rejected") {
        // A poll that comes back rejected while waiting should say so; a poll
        // that simply has not been answered yet must not flash an error.
        setErrorKey(payload.reason);
        setPhase({ kind: "lobby" });
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
      });
    },
    [slug, knownName, displayName, askForName, askForPassword, password, preview],
  );

  /*
   * Waiting for a host to open the door.
   *
   * The same join request is repeated rather than a status endpoint being
   * polled: whatever the host decides, the answer has to pass every other
   * check again anyway — the room may have been locked or filled in the
   * meantime — and this way there is one place where joining is decided.
   */
  const joinRef = useRef(join);
  joinRef.current = join;

  useEffect(() => {
    if (phase.kind !== "waiting") {
      return;
    }

    const { choices } = phase;
    const timer = setInterval(() => void joinRef.current(choices), ADMISSION_POLL_MS);

    return () => clearInterval(timer);
  }, [phase]);

  if (phase.kind === "connected") {
    const { choices } = phase;

    return (
      <LiveKitRoom
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
          !askForName && !askForPassword ? null : (
            <div className="space-y-4">
              {askForName ? (
                <Field label={t("yourName")} htmlFor={nameId}>
                  <Input
                    id={nameId}
                    value={displayName}
                    onChange={(event) => {
                      setDisplayName(event.target.value);
                      setErrorKey(null);
                    }}
                    minLength={DISPLAY_NAME_MIN_LENGTH}
                    maxLength={40}
                    required
                    aria-invalid={errorKey === "name_required"}
                    autoComplete="nickname"
                    placeholder={t("namePlaceholder")}
                  />
                </Field>
              ) : null}

              {askForPassword ? (
                <Field label={t("password")} htmlFor={passwordId}>
                  <Input
                    id={passwordId}
                    type="password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setErrorKey(null);
                    }}
                    aria-invalid={
                      errorKey === "password_required" || errorKey === "password_incorrect"
                    }
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
