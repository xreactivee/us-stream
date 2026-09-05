"use client";

import {
  BREAKOUT_DEFAULT_DURATION_MINUTES,
  BREAKOUT_MAX_ROOMS,
  BREAKOUT_MIN_ROOMS,
} from "@us-stream/shared";
import { Loader2, Megaphone, Split, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useCallback, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

interface BreakoutView {
  id: string;
  name: string;
  participants: number;
  closesAt: number | null;
}

/**
 * The host's controls for splitting the room.
 *
 * Every action goes to our API, which checks the caller is a host and then
 * asks the realtime service to do the work. The host's browser never mints or
 * handles anyone else's access token.
 */
export function BreakoutControls({ slug }: { slug: string }) {
  const t = useTranslations("room");
  const countId = useId();
  const durationId = useId();

  const [open, setOpen] = useState<BreakoutView[]>([]);
  const [pending, setPending] = useState(false);
  const [count, setCount] = useState(BREAKOUT_MIN_ROOMS);
  const [duration, setDuration] = useState<number | "">(BREAKOUT_DEFAULT_DURATION_MINUTES);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/rooms/${slug}/breakouts`).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as {
      breakouts?: BreakoutView[];
    } | null;

    setOpen(payload?.breakouts ?? []);
  }, [slug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function start() {
    setPending(true);

    await fetch(`/api/rooms/${slug}/breakouts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        count,
        durationMinutes: duration === "" ? null : duration,
      }),
    }).catch(() => null);

    setPending(false);
    await refresh();
  }

  async function recall() {
    setPending(true);
    await fetch(`/api/rooms/${slug}/breakouts`, { method: "DELETE" }).catch(() => null);
    setPending(false);
    await refresh();
  }

  async function broadcast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get("body") ?? "").trim();

    if (!body) {
      return;
    }

    form.reset();

    await fetch(`/api/rooms/${slug}/breakouts/broadcast`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    }).catch(() => null);
  }

  if (open.length > 0) {
    return (
      <div className="space-y-3 border-t border-border p-3">
        <p className="text-xs text-muted-foreground">
          {t("breakoutOpenCount", { count: open.length })}
        </p>

        <form onSubmit={broadcast} className="flex gap-2">
          <Input
            name="body"
            placeholder={t("breakoutBroadcastPlaceholder")}
            aria-label={t("breakoutBroadcast")}
            className="h-9"
          />
          <Button
            type="submit"
            size="icon"
            className="size-9 shrink-0"
            aria-label={t("breakoutBroadcast")}
          >
            <Megaphone />
          </Button>
        </form>

        <Button variant="outline" size="sm" className="w-full" disabled={pending} onClick={recall}>
          {pending ? <Loader2 className="animate-spin" /> : <Undo2 />}
          {t("breakoutRecall")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-border p-3">
      <h3 className="text-sm font-semibold">{t("breakouts")}</h3>

      <div className="grid grid-cols-2 gap-2">
        <Field label={t("breakoutRoomCount")} htmlFor={countId}>
          <Input
            id={countId}
            type="number"
            min={BREAKOUT_MIN_ROOMS}
            max={BREAKOUT_MAX_ROOMS}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            className="h-9"
          />
        </Field>

        <Field label={t("breakoutDuration")} htmlFor={durationId} hint={t("breakoutNoLimit")}>
          <Input
            id={durationId}
            type="number"
            min={1}
            value={duration}
            onChange={(event) =>
              setDuration(event.target.value === "" ? "" : Number(event.target.value))
            }
            className="h-9"
          />
        </Field>
      </div>

      <p className="text-[0.6875rem] text-muted-foreground">{t("breakoutHint")}</p>

      <Button size="sm" className="w-full" disabled={pending} onClick={start}>
        {pending ? <Loader2 className="animate-spin" /> : <Split />}
        {t("breakoutStart")}
      </Button>
    </div>
  );
}
