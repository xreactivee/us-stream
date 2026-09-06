"use client";

import { Check, Copy, Lock, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { deleteRoomAction } from "@/app/actions/rooms";
import { Button } from "@/components/ui/button";

export interface RoomSummary {
  id: string;
  slug: string;
  name: string;
  isPersistent: boolean;
  isLocked: boolean;
  hasPassword: boolean;
  waitingRoomEnabled: boolean;
  isOwner: boolean;
}

export function RoomCard({ room }: { room: RoomSummary }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [deleting, startDeleting] = useTransition();

  const [removed, setRemoved] = useState(false);

  const badges = [
    room.isPersistent ? t("badgePersistent") : t("badgeTemporary"),
    room.hasPassword ? t("badgePassword") : null,
    room.waitingRoomEnabled ? t("badgeWaitingRoom") : null,
    room.isLocked ? t("badgeLocked") : null,
  ].filter(Boolean) as string[];

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/r/${room.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (removed) {
    return null;
  }

  return (
    <article className="flex flex-col gap-5 bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{room.name}</h3>
          <p className="tabular mt-1 truncate text-sm text-muted-foreground">{room.slug}</p>
        </div>
        {room.isLocked ? <Lock className="mt-1 size-4 shrink-0 text-degraded" /> : null}
      </div>

      <ul className="flex flex-wrap gap-1.5">
        {badges.map((badge) => (
          <li
            key={badge}
            className="rounded-md bg-secondary px-2 py-1 text-[0.6875rem] tracking-[0.06em] text-muted-foreground uppercase"
          >
            {badge}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link href={`/r/${room.slug}`}>{t("open")}</Link>
        </Button>

        <Button type="button" variant="outline" size="sm" onClick={copyLink}>
          {copied ? <Check className="text-connected" /> : <Copy />}
          {copied ? t("linkCopied") : t("copyLink")}
        </Button>

        {room.isOwner ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("delete")}
            title={t("delete")}
            disabled={deleting}
            className="ml-auto text-muted-foreground hover:text-destructive"
            onClick={() => {
              if (!window.confirm(t("deleteConfirm"))) {
                return;
              }

              setRemoved(true);

              startDeleting(async () => {
                const result = await deleteRoomAction(room.id).catch(() => null);

                if (!result?.ok) {
                  setRemoved(false);
                  return;
                }

                router.refresh();
              });
            }}
          >
            <Trash2 />
          </Button>
        ) : null}
      </div>
    </article>
  );
}
