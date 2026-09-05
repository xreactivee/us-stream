import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireSession } from "@/lib/session";

export async function generateMetadata() {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

export default async function SettingsPage() {
  await requireSession("/settings");
  const t = await getTranslations("settings");

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <header>
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      <div className="mt-10 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        <section className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <h2 className="font-medium">{t("language")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("languageHint")}</p>
          </div>
          <LocaleSwitcher />
        </section>

        <section className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <h2 className="font-medium">{t("theme")}</h2>
          <ThemeToggle />
        </section>
      </div>
    </div>
  );
}
