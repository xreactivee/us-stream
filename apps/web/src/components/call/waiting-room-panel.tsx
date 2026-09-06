"use client";

import { Check, DoorOpen, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { PendingAdmission } from "@/app/api/rooms/[slug]/admissions/route";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_MS = 4000;

export function useAdmissions({ slug, enabled }: { slug: string; enabled: boolean }) {
  const [pending, setPending] = useState<PendingAdmission[]>([]);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/rooms/${slug}/admissions`).catch(() => null);

    if (!response?.ok) {
      return;
    }

    const payload = (await response.json().catch(() => null)) as {
      admissions?: PendingAdmission[];
    } | null;

    if (payload?.admissions) {
      setPending(payload.admissions);
    }
  }, [slug]);

  useEffect(() => {
    if (!enabled) {
      setPending([]);
      return;
    }

    void refresh();
    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [enabled, refresh]);

  const resolve = useCallback(
    async (requestId: string, action: "admit" | "deny") => {
      // Taken off the list first. The decision is the host's and it has
      // already been made; waiting for the round trip only makes the button
      // feel broken.
      setPending((current) => current.filter((entry) => entry.id !== requestId));

      const response = await fetch(`/api/rooms/${slug}/admissions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      }).catch(() => null);

      if (!response?.ok) {
        await refresh();
      }
    },
    [slug, refresh],
  );

  return { pending, resolve };
}

export function WaitingRoomPanel({
  pending,
  onResolve,
}: {
  pending: PendingAdmission[];
  onResolve: (requestId: string, action: "admit" | "deny") => void;
}) {
  const t = useTranslations("room");

  if (pending.length === 0) {
    return null;
  }

  return (
    <section className="shrink-0 space-y-2 rounded-xl border border-signal/40 bg-signal/10 p-3">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <DoorOpen className="size-4 text-signal" aria-hidden />
        {t("admissionTitle", { count: pending.length })}
      </h2>

      <ul className="space-y-1.5">
        {pending.map((entry) => (
          <li key={entry.id} className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm">{entry.displayName}</span>

            <Button size="sm" onClick={() => onResolve(entry.id, "admit")}>
              <Check />
              {t("admissionAdmit")}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onResolve(entry.id, "deny")}
            >
              <X />
              {t("admissionDeny")}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
