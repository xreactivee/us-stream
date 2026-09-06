import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { boundsOf, ShapeNode } from "@/components/board-shapes";
import { canViewMeeting, getMeetingDetail } from "@/lib/history";
import { requireSession } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/m/[meetingId]">) {
  const detail = await getMeetingDetail((await params).meetingId);
  return { title: detail?.room.name ?? "us-stream" };
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default async function MeetingPage({ params }: PageProps<"/m/[meetingId]">) {
  const { meetingId } = await params;
  const session = await requireSession(`/m/${meetingId}`);
  const detail = await getMeetingDetail(meetingId);

  if (!detail) {
    notFound();
  }

  if (!canViewMeeting(detail.meeting, detail.room, session.user.id)) {
    notFound();
  }

  const [t, format] = await Promise.all([getTranslations("history"), getFormatter()]);
  const { meeting, room, messages, board, notes } = detail;

  const totalSpeaking = meeting.participants.reduce(
    (total, participant) => total + participant.speakingMs,
    0,
  );
  const ranked = [...meeting.participants].sort((a, b) => b.speakingMs - a.speakingMs);
  const bounds = boundsOf(board);

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-14">
      <header>
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          {t("backToHistory")}
        </Link>

        <h1 className="mt-3 text-3xl font-semibold">{room.name}</h1>
        <p className="tabular mt-2 text-sm text-muted-foreground">
          {format.dateTime(meeting.startedAt, { dateStyle: "long", timeStyle: "short" })}
          {meeting.endedAt
            ? ` · ${formatDuration(meeting.endedAt.getTime() - meeting.startedAt.getTime())}`
            : ""}
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold">{t("participants")}</h2>
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {meeting.participants.map((participant) => (
            <li
              key={participant.identity}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <span className="truncate text-sm">{participant.displayName}</span>
              <span className="tabular shrink-0 text-xs text-muted-foreground">
                {t("joined")} {format.dateTime(participant.joinedAt, { timeStyle: "short" })}
                {" · "}
                {participant.leftAt
                  ? `${t("left")} ${format.dateTime(participant.leftAt, { timeStyle: "short" })}`
                  : t("stillIn")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">{t("talkTime")}</h2>

        {totalSpeaking === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("talkTimeEmpty")}</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {ranked.map((participant, index) => {
              const share = participant.speakingMs / totalSpeaking;

              return (
                <li key={participant.identity} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">{participant.displayName}</span>
                    <span className="tabular shrink-0 text-xs text-muted-foreground">
                      {formatDuration(participant.speakingMs)} · {Math.round(share * 100)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(2, Math.round(share * 100))}%`,
                        backgroundColor: `var(--chart-${(index % 5) + 1})`,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">{t("transcript")}</h2>

        {messages.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("transcriptEmpty")}</p>
        ) : (
          <ol className="mt-3 space-y-3 rounded-xl border border-border bg-card p-4">
            {messages.map((message) => (
              <li key={message.id} className="text-sm">
                <span className="tabular mr-2 text-xs text-muted-foreground">
                  {format.dateTime(new Date(message.createdAt), { timeStyle: "short" })}
                </span>
                <span className="font-medium">{message.senderName}</span>
                <span className="mt-0.5 block wrap-break-word text-muted-foreground">
                  {message.body}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("board")}</h2>

        <p className="flex items-start gap-2 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {t("roomStateWarning")}
        </p>

        {board.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("boardEmpty")}</p>
        ) : (
          <div className="overflow-hidden rounded-xl bg-tile">
            <svg
              viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
              className="h-auto w-full"
              role="img"
              aria-label={t("board")}
            >
              <title>{t("board")}</title>
              {board.map((shape) => (
                <ShapeNode key={shape.id} shape={shape} />
              ))}
            </svg>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">{t("notes")}</h2>

        {notes.trim().length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("notesEmpty")}</p>
        ) : (
          <div className="mt-3 rounded-xl border border-border bg-card p-4 text-sm whitespace-pre-wrap text-muted-foreground">
            {notes}
          </div>
        )}
      </section>
    </div>
  );
}
