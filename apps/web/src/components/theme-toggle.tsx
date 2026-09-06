"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useId, useState } from "react";
import { setThemePreference } from "@/app/actions/preferences";

const OPTIONS = [
  { value: "light", Icon: Sun, labelKey: "themeLight" },
  { value: "dark", Icon: Moon, labelKey: "themeDark" },
  { value: "system", Icon: Monitor, labelKey: "themeSystem" },
] as const;

export function ThemeToggle() {
  const t = useTranslations("settings");
  const { theme, setTheme } = useTheme();
  const groupName = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <fieldset className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
      <legend className="sr-only">{t("toggleTheme")}</legend>

      {OPTIONS.map(({ value, Icon, labelKey }) => (
        <label
          key={value}
          title={t(labelKey)}
          className="grid size-8 cursor-pointer place-items-center rounded-[7px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring"
        >
          <input
            type="radio"
            name={groupName}
            value={value}
            aria-label={t(labelKey)}
            checked={mounted && theme === value}
            onChange={() => {
              setTheme(value);
              void setThemePreference(value);
            }}
            className="sr-only"
          />
          <Icon className="size-4" aria-hidden />
          <span className="sr-only">{t(labelKey)}</span>
        </label>
      ))}
    </fieldset>
  );
}
