import { Plus, Video } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";

export async function generateMetadata() {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

export default async function DashboardPage() {
  const session = await requireSession("/dashboard");
  const t = await getTranslations("dashboard");

  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" disabled>
            <Plus />
            {t("newRoom")}
          </Button>
          <Button disabled>
            <Video />
            {t("instantMeeting")}
          </Button>
        </div>
      </header>

      <section className="mt-10 rounded-2xl border border-dashed border-border bg-card/40 px-8 py-16 text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-full bg-secondary">
          <Video className="size-5 text-muted-foreground" aria-hidden />
        </span>
        <h2 className="mt-5 text-lg font-semibold">{t("emptyTitle")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-pretty text-muted-foreground">
          {t("emptyBody")}
        </p>
        <p className="tabular mt-6 text-xs tracking-[0.12em] text-muted-foreground uppercase">
          {t("comingSoon")}
        </p>
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        <span className="tabular">{session.user.email}</span>
      </p>
    </div>
  );
}
