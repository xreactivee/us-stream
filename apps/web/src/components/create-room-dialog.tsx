"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { createRoomAction } from "@/app/actions/rooms";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

export function CreateRoomDialog() {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const nameId = useId();
  const passwordId = useId();

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const [waitingRoom, setWaitingRoom] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(false);

    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "").trim();

    const result = await createRoomAction({
      name: String(data.get("name") ?? ""),
      isPersistent: persistent,
      waitingRoomEnabled: waitingRoom,
      e2eeEnabled: false,
      password: password.length > 0 ? password : null,
    });

    if (!result.ok) {
      setError(true);
      setPending(false);
      return;
    }

    setOpen(false);
    setPending(false);
    router.push(`/r/${result.slug}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus />
          {t("newRoom")}
        </Button>
      </DialogTrigger>

      <DialogContent closeLabel={tCommon("cancel")}>
        <DialogHeader title={t("createTitle")} description={t("createSubtitle")} />

        <form onSubmit={handleSubmit} className="space-y-6">
          <Field
            label={t("roomName")}
            htmlFor={nameId}
            error={error ? tCommon("error") : undefined}
          >
            <Input
              id={nameId}
              name="name"
              required
              maxLength={80}
              autoFocus
              placeholder={t("roomNamePlaceholder")}
            />
          </Field>

          <Field label={t("password")} htmlFor={passwordId} hint={t("passwordOptional")}>
            <Input id={passwordId} name="password" type="password" autoComplete="off" />
          </Field>

          <ToggleRow
            label={t("persistent")}
            hint={t("persistentHint")}
            checked={persistent}
            onCheckedChange={setPersistent}
          />

          <ToggleRow
            label={t("waitingRoom")}
            hint={t("waitingRoomHint")}
            checked={waitingRoom}
            onCheckedChange={setWaitingRoom}
          />

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {pending ? t("creating") : t("create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  const id = useId();

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
