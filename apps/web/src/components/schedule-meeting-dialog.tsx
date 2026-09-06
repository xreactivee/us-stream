"use client";

import { CalendarPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Label } from "@/components/ui/field";

export interface SchedulableRoom {
  id: string;
  name: string;
}

export function ScheduleMeetingDialog({ rooms }: { rooms: SchedulableRoom[] }) {
  const t = useTranslations("schedule");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const titleId = useId();
  const roomId = useId();
  const startsId = useId();
  const durationId = useId();

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFailed(false);

    const data = new FormData(event.currentTarget);

    const response = await fetch("/api/scheduled", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        roomId: String(data.get("roomId") ?? ""),
        title: String(data.get("title") ?? ""),
        // `datetime-local` gives wall-clock text with no zone; the browser's
        // own Date reading is what the person meant when they typed it.
        startsAt: new Date(String(data.get("startsAt") ?? "")).toISOString(),
        durationMinutes: Number(data.get("durationMinutes") ?? 30),
      }),
    }).catch(() => null);

    setPending(false);

    if (!response?.ok) {
      setFailed(true);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (rooms.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarPlus />
          {t("schedule")}
        </Button>
      </DialogTrigger>

      <DialogContent closeLabel={tCommon("cancel")}>
        <DialogHeader title={t("schedule")} />

        <form onSubmit={submit} className="space-y-5">
          <Field
            label={t("meetingTitle")}
            htmlFor={titleId}
            error={failed ? tCommon("error") : undefined}
          >
            <Input
              id={titleId}
              name="title"
              required
              maxLength={120}
              placeholder={t("meetingTitlePlaceholder")}
            />
          </Field>

          <div className="space-y-2">
            <Label htmlFor={roomId}>{t("room")}</Label>
            <select
              id={roomId}
              name="roomId"
              required
              className="h-11 w-full cursor-pointer truncate rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
            >
              {rooms.map((room) => (
                <option
                  key={room.id}
                  value={room.id}
                  className="bg-popover text-popover-foreground"
                >
                  {room.name}
                </option>
              ))}
            </select>
          </div>

          <Field label={t("startsAt")} htmlFor={startsId}>
            <Input id={startsId} name="startsAt" type="datetime-local" required />
          </Field>

          <Field label={t("durationMinutes")} htmlFor={durationId}>
            <Input
              id={durationId}
              name="durationMinutes"
              type="number"
              min={5}
              max={24 * 60}
              defaultValue={30}
              required
            />
          </Field>

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {pending ? t("creating") : t("create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
