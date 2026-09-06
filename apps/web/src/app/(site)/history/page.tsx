import { CalendarClock, Users } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { listMeetingsForUser } from "@/lib/history";
import { requireSession } from "@/lib/session";

export async function generateMetadata() {
  const t = await getTranslations("history");
  return { title: t("title") };
}

/** Minutes, rounded — nobody reads a meeting length to the second. */
function durationMinutes(startedAt: number, endedAt: number | null): number {
  return Math.max(1, Math.round(((endedAt ?? startedAt) - startedAt) / 60_000));
}

export default async function HistoryPage() {
  const session = await requireSession("/history");
  const [t, format, meetings] = await Promise.all([
    getTranslations("history"),
    getFormatter(),
    listMeetingsForUser(session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <header>
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      {meetings.length === 0 ? (
        <section className="mt-10 rounded-2xl border border-dashed border-border bg-card/40 px-8 py-16 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-secondary">
            <CalendarClock className="size-5 text-muted-foreground" aria-hidden />
          </span>
          <h2 className="mt-5 text-lg font-semibold">{t("empty")}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-pretty text-muted-foreground">
            {t("emptyHint")}
          </p>
        </section>
      ) : (
        <ul className="mt-10 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {meetings.map((meeting) => (
            <li key={meeting.id}>
              <Link
                href={`/m/${meeting.id}`}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{meeting.roomName}</p>
                  <p className="tabular mt-0.5 text-xs text-muted-foreground">
                    {format.dateTime(new Date(meeting.startedAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-5 text-xs text-muted-foreground">
                  <span className="tabular">
                    {t("duration")} {durationMinutes(meeting.startedAt, meeting.endedAt)}′
                  </span>
                  <span className="tabular flex items-center gap-1.5">
                    <Users className="size-3.5" aria-hidden />
                    {meeting.participantCount}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
