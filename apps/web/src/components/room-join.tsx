"use client";

import type { JoinRoomResponse, Role } from "@us-stream/shared";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

type JoinState =
  | { kind: "idle" }
  | { kind: "joining" }
  | { kind: "waiting"; requestId: string }
  | { kind: "joined"; identity: string; role: Role; roomName: string }
  | { kind: "error"; reason: string };

/**
 * The pre-join step: collects whatever the room requires, then asks the server
 * for an access token.
 *
 * Phase 3 replaces the "connected" panel with the actual call. Until then this
 * is where the token exchange is exercised end to end, which is the part worth
 * getting right first — the browser never decides its own permissions, it only
 * receives a signed token and reports what it was given.
 */
export function RoomJoin({
  slug,
  requiresPassword,
  knownName,
  initialRole,
}: {
  slug: string;
  requiresPassword: boolean;
  knownName: string | null;
  initialRole: Role;
}) {
  const t = useTranslations("room");
  const nameId = useId();
  const passwordId = useId();
  const [state, setState] = useState<JoinState>({ kind: "idle" });

  // A host is never asked for the room's own password.
  const askForPassword = requiresPassword && initialRole === "guest";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "joining" });

    const data = new FormData(event.currentTarget);

    const response = await fetch(`/api/rooms/${slug}/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: knownName ? null : String(data.get("displayName") ?? ""),
        password: askForPassword ? String(data.get("password") ?? "") : null,
      }),
    }).catch(() => null);

    if (!response) {
      setState({ kind: "error", reason: "generic" });
      return;
    }

    const payload = (await response.json().catch(() => null)) as JoinRoomResponse | null;

    if (!payload) {
      setState({ kind: "error", reason: "generic" });
      return;
    }

    if (payload.status === "joined") {
      setState({
        kind: "joined",
        identity: payload.identity,
        role: payload.role,
        roomName: payload.roomName,
      });
      return;
    }

    if (payload.status === "waiting") {
      setState({ kind: "waiting", requestId: payload.requestId });
      return;
    }

    setState({ kind: "error", reason: payload.reason });
  }

  if (state.kind === "waiting") {
    return (
      <Panel title={t("waitingTitle")} body={t("waitingBody")}>
        <Loader2 className="size-5 animate-spin text-signal" />
      </Panel>
    );
  }

  if (state.kind === "joined") {
    return (
      <Panel title={t("connectedTitle")} body={t("connectedBody")}>
        <dl className="grid w-full gap-px overflow-hidden rounded-xl border border-border bg-border text-sm">
          <Row label={t("identity")} value={state.identity} />
          <Row label={t("role")} value={state.role} />
        </dl>
      </Panel>
    );
  }

  const pending = state.kind === "joining";
  const errorKey = state.kind === "error" ? state.reason : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {knownName ? null : (
        <Field label={t("yourName")} htmlFor={nameId}>
          <Input
            id={nameId}
            name="displayName"
            required
            minLength={2}
            maxLength={40}
            autoFocus
            autoComplete="nickname"
            placeholder={t("namePlaceholder")}
          />
        </Field>
      )}

      {askForPassword ? (
        <Field label={t("password")} htmlFor={passwordId}>
          <Input id={passwordId} name="password" type="password" autoComplete="off" required />
        </Field>
      ) : null}

      {errorKey ? (
        <p className="text-sm text-destructive" role="alert">
          {t(`errors.${errorKey}`)}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? t("joining") : t("join")}
      </Button>
    </form>
  );
}

function Panel({
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 bg-card px-4 py-3">
      <dt className="text-xs tracking-[0.08em] text-muted-foreground uppercase">{label}</dt>
      <dd className="tabular truncate text-xs">{value}</dd>
    </div>
  );
}
