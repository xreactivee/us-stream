"use client";

import { LOCALES, type Locale } from "@us-stream/shared";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { setLocalePreference } from "@/app/actions/preferences";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<Locale, string> = {
  tr: "Türkçe",
  en: "English",
};

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("settings");
  const current = useLocale() as Locale;
  const [pending, startTransition] = useTransition();

  return (
    <label
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card pr-2 pl-3 text-sm",
        pending && "opacity-60",
        className,
      )}
    >
      <Languages className="size-4 text-muted-foreground" aria-hidden />
      <span className="sr-only">{t("language")}</span>
      <select
        value={current}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          startTransition(async () => {
            await setLocalePreference(next);
          });
        }}
        className="cursor-pointer bg-transparent pr-1 outline-none"
      >
        {LOCALES.map((locale) => (
          <option key={locale} value={locale} className="bg-popover text-popover-foreground">
            {LOCALE_LABELS[locale]}
          </option>
        ))}
      </select>
    </label>
  );
}
