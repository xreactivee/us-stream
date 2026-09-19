"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { setPassword } from "@/app/actions/preferences";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

function messageKeyFor(code: string | undefined): string {
  switch (code) {
    case "PASSWORD_TOO_SHORT":
      return "tooShort";
    case "PASSWORD_TOO_LONG":
      return "tooLong";
    case "INVALID_PASSWORD":
      return "wrongCurrent";
    default:
      return "generic";
  }
}

export function PasswordPanel({ hasPassword }: { hasPassword: boolean }) {
  const t = useTranslations("password");
  const currentId = useId();
  const newId = useId();

  const [pending, setPending] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorKey(null);
    setSuccess(false);

    const data = new FormData(event.currentTarget);
    const newPassword = String(data.get("newPassword") ?? "");

    if (hasPassword) {
      const currentPassword = String(data.get("currentPassword") ?? "");
      const result = await authClient.changePassword({ currentPassword, newPassword });

      setPending(false);

      if (result.error) {
        setErrorKey(messageKeyFor(result.error.code));
        return;
      }
    } else {
      const result = await setPassword(newPassword);

      setPending(false);

      if (!result.ok) {
        setErrorKey(messageKeyFor(result.error));
        return;
      }
    }

    setSuccess(true);
    event.currentTarget.reset();
  }

  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4">
      <div>
        <h2 className="text-sm font-medium">{t(hasPassword ? "changeTitle" : "setTitle")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t(hasPassword ? "changeHint" : "setHint")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {hasPassword ? (
          <Field label={t("current")} htmlFor={currentId}>
            <Input
              id={currentId}
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
          </Field>
        ) : null}

        <Field
          label={t("new")}
          htmlFor={newId}
          hint={t("newPlaceholder")}
          error={errorKey ? t(`errors.${errorKey}`) : undefined}
        >
          <Input
            id={newId}
            name="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Field>

        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {pending ? t("submitting") : t(hasPassword ? "submitChange" : "submitSet")}
          </Button>

          {success ? <span className="text-xs text-connected">{t("success")}</span> : null}
        </div>
      </form>
    </div>
  );
}
