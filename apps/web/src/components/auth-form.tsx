"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { signIn, signUp } from "@/lib/auth-client";
import { GoogleMark } from "./google-mark";

type Mode = "sign-in" | "sign-up";

function messageKeyFor(code: string | undefined): string {
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
      return "invalidCredentials";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "emailTaken";
    case "PASSWORD_TOO_SHORT":
      return "weakPassword";
    case "ACCOUNT_NOT_LINKED":
      return "accountNotLinked";
    default:
      return "generic";
  }
}

function messageKeyForCallback(error: string | null): string | null {
  if (!error) {
    return null;
  }

  return error === "account_not_linked" ? "accountNotLinked" : "generic";
}

export function AuthForm({
  mode,
  googleEnabled,
  next,
  callbackError = null,
}: {
  mode: Mode;
  googleEnabled: boolean;
  next: string;

  callbackError?: string | null;
}) {
  const t = useTranslations("auth");
  const router = useRouter();
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();

  const [pending, setPending] = useState(false);

  const [errorKey, setErrorKey] = useState<string | null>(() =>
    messageKeyForCallback(callbackError),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorKey(null);

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    const result =
      mode === "sign-up"
        ? await signUp.email({
            name: String(data.get("name") ?? ""),
            email,
            password,
            callbackURL: next,
          })
        : await signIn.email({ email, password, callbackURL: next });

    if (result.error) {
      setErrorKey(messageKeyFor(result.error.code));
      setPending(false);
      return;
    }

    if (mode === "sign-up" && result.data && !result.data.token) {
      setErrorKey("emailTaken");
      setPending(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {googleEnabled ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            disabled={pending}
            onClick={() => {
              setPending(true);
              void signIn.social({ provider: "google", callbackURL: next });
            }}
          >
            <GoogleMark />
            {t("continueWithGoogle")}
          </Button>

          <div className="flex items-center gap-4 text-xs tracking-[0.14em] text-muted-foreground uppercase">
            <span className="h-px flex-1 bg-border" />
            {t("or")}
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === "sign-up" ? (
          <Field label={t("name")} htmlFor={nameId}>
            <Input
              id={nameId}
              name="name"
              required
              autoComplete="name"
              placeholder={t("namePlaceholder")}
            />
          </Field>
        ) : null}

        <Field label={t("email")} htmlFor={emailId}>
          <Input
            id={emailId}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
          />
        </Field>

        <Field
          label={t("password")}
          htmlFor={passwordId}
          hint={mode === "sign-up" ? t("passwordHint") : undefined}
          error={errorKey ? t(`errors.${errorKey}`) : undefined}
        >
          <Input
            id={passwordId}
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {pending
            ? t(mode === "sign-up" ? "signingUp" : "signingIn")
            : t(mode === "sign-up" ? "signUpTitle" : "signInTitle")}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        {mode === "sign-up" ? t("hasAccount") : t("noAccount")}{" "}
        <Link
          href={mode === "sign-up" ? "/sign-in" : "/sign-up"}
          className="text-foreground underline underline-offset-4"
        >
          {mode === "sign-up" ? t("signInTitle") : t("signUpTitle")}
        </Link>
      </p>
    </div>
  );
}
