import { ClipboardList, DoorOpen, MessagesSquare, MonitorUp, PenLine, Video } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { JoinWithCode } from "@/components/join-with-code";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

const FEATURES = [
  { key: "video", Icon: Video },
  { key: "screen", Icon: MonitorUp },
  { key: "chat", Icon: MessagesSquare },
  { key: "board", Icon: PenLine },
  { key: "host", Icon: DoorOpen },
  { key: "poll", Icon: ClipboardList },
] as const;

export default async function Home() {
  const [t, session] = await Promise.all([getTranslations("landing"), getSession()]);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="stage-glow border-b border-border/70">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
            <span className="[animation:var(--animate-rise)] inline-flex items-center gap-2.5 rounded-full border border-border bg-card/60 py-1.5 pr-4 pl-3 text-xs tracking-[0.14em] text-muted-foreground uppercase backdrop-blur">
              <span className="size-2 rounded-full bg-signal [animation:var(--animate-on-air)]" />
              {t("badge")}
            </span>

            <h1 className="[animation:var(--animate-rise)] [animation-delay:80ms] mt-8 max-w-3xl text-5xl leading-[0.95] font-semibold sm:text-7xl">
              {t("headline")}
            </h1>

            <p className="[animation:var(--animate-rise)] [animation-delay:160ms] mt-7 max-w-xl text-lg text-pretty text-muted-foreground">
              {t("subhead")}
            </p>

            <div className="[animation:var(--animate-rise)] [animation-delay:240ms] mt-11 flex flex-col gap-8 sm:flex-row sm:items-end sm:gap-12">
              <Button asChild size="lg">
                <Link href={session ? "/dashboard" : "/sign-up"}>{t("startMeeting")}</Link>
              </Button>

              <JoinWithCode />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ key, Icon }) => (
              <article key={key} className="bg-card p-7">
                <Icon className="size-5 text-signal" aria-hidden />
                <h2 className="mt-5 text-lg font-semibold">{t(`features.${key}Title`)}</h2>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  {t(`features.${key}Body`)}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
