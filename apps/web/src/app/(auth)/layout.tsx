import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("auth");

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Wordmark />
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center py-14">
          <div className="mx-auto w-full max-w-sm">{children}</div>
        </div>
      </div>

      {/* The stage panel. Decorative, so it is hidden rather than stacked on
          small screens where it would only push the form below the fold. */}
      <aside className="stage-glow relative hidden overflow-hidden border-l border-border bg-card/40 lg:flex lg:flex-col lg:justify-end">
        <div className="p-14">
          <p className="max-w-md font-display text-3xl leading-tight font-semibold text-balance">
            {t("guestNotice")}
          </p>
          <p className="tabular mt-6 text-xs tracking-[0.16em] text-muted-foreground uppercase">
            us-stream
          </p>
        </div>
      </aside>
    </div>
  );
}
