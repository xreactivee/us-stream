"use client";

import { CalendarDays, Download, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export interface ScheduledView {
  id: string;
  title: string;
  roomName: string;
  roomSlug: string;
  startsAt: number;
  durationMinutes: number;
  isMine: boolean;
}

export function ScheduledList({ items }: { items: ScheduledView[] }) {
  const t = useTranslations("schedule");
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [cancelled, setCancelled] = useState<string[]>([]);

  const visible = items.filter((item) => !cancelled.includes(item.id));

  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {visible.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
          <CalendarDays className="size-4 shrink-0 text-signal" aria-hidden />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="tabular mt-0.5 truncate text-xs text-muted-foreground">
              {item.roomName} ·{" "}
              {format.dateTime(new Date(item.startsAt), {
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              · {item.durationMinutes}′
            </p>
          </div>

          <Button asChild variant="ghost" size="sm">
            <Link href={`/r/${item.roomSlug}`}>{item.roomSlug}</Link>
          </Button>

          <Button asChild variant="outline" size="sm">
            <a href={`/api/scheduled/${item.id}/ics`} download>
              <Download />
              {t("addToCalendar")}
            </a>
          </Button>

          {item.isMine ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              aria-label={t("cancel")}
              title={t("cancel")}
              disabled={pending}
              onClick={() => {
                if (!window.confirm(t("cancelConfirm"))) {
                  return;
                }

                setCancelled((current) => [...current, item.id]);

                startTransition(async () => {
                  const response = await fetch(`/api/scheduled/${item.id}`, {
                    method: "DELETE",
                  }).catch(() => null);

                  if (!response?.ok) {
                    setCancelled((current) => current.filter((id) => id !== item.id));
                    return;
                  }

                  router.refresh();
                });
              }}
            >
              <Trash2 />
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
