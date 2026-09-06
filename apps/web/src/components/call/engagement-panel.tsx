"use client";

import { POLL_MAX_OPTIONS, POLL_MIN_OPTIONS, QUESTION_MAX_LENGTH } from "@us-stream/shared";
import { Check, ChevronUp, Loader2, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

interface PollView {
  id: string;
  question: string;
  options: { index: number; label: string; votes: number }[];
  totalVoters: number;
  allowMultiple: boolean;
  isClosed: boolean;
  myVotes: number[];
}

/**
 * The poll as it will look once the server has counted this vote.
 *
 * Only this client's own contribution is moved, so the guess is wrong by at
 * most the votes that arrived from other people in the same instant — and the
 * server's answer replaces it a moment later regardless.
 */
function withMyVotes(poll: PollView, optionIndexes: number[]): PollView {
  const chosen = new Set(optionIndexes);
  const previous = new Set(poll.myVotes);

  return {
    ...poll,
    myVotes: optionIndexes,
    options: poll.options.map((option) => ({
      ...option,
      votes:
        option.votes + (chosen.has(option.index) ? 1 : 0) - (previous.has(option.index) ? 1 : 0),
    })),
    totalVoters: poll.totalVoters + (chosen.size > 0 ? 1 : 0) - (previous.size > 0 ? 1 : 0),
  };
}

interface QuestionView {
  id: string;
  body: string;
  askedByName: string;
  upvotes: number;
  hasUpvoted: boolean;
  isAnswered: boolean;
  createdAt: number;
}

/**
 * Polls and Q&A.
 *
 * Both are ordinary request/response against our own API rather than
 * data-channel state: a vote has to be counted once and survive a reconnect,
 * which is a database's job, not a broadcast's. The data channel only carries
 * the nudge to refetch.
 */
export function EngagementPanel({
  slug,
  canModerate,
  askedByName,
}: {
  slug: string;
  canModerate: boolean;
  /** Shown under a question the moment it is asked, before the server answers. */
  askedByName: string;
}) {
  const t = useTranslations("room");
  const [polls, setPolls] = useState<PollView[]>([]);
  const [questions, setQuestions] = useState<QuestionView[]>([]);
  const [composing, setComposing] = useState(false);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    setFailed(false);

    const [pollResponse, questionResponse] = await Promise.all([
      fetch(`/api/rooms/${slug}/polls`).catch(() => null),
      fetch(`/api/rooms/${slug}/questions`).catch(() => null),
    ]);

    const pollPayload = (await pollResponse?.json().catch(() => null)) as {
      polls?: PollView[];
    } | null;
    const questionPayload = (await questionResponse?.json().catch(() => null)) as {
      questions?: QuestionView[];
    } | null;

    if (pollPayload?.polls) {
      setPolls(pollPayload.polls);
    }

    if (questionPayload?.questions) {
      setQuestions(questionPayload.questions);
    }
  }, [slug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /*
   * Every action below moves the interface first and talks to the server
   * second.
   *
   * A vote that waits for a round trip before the bar moves reads as a broken
   * button, and the person presses it again. The server remains the authority:
   * it answers with the poll as it really stands and that answer replaces the
   * guess, and a request that fails outright puts back what was on screen
   * before the press.
   */
  async function vote(pollId: string, optionIndexes: number[]) {
    const before = polls;

    setPolls((current) =>
      current.map((poll) => (poll.id === pollId ? withMyVotes(poll, optionIndexes) : poll)),
    );

    const response = await fetch(`/api/rooms/${slug}/polls/${pollId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ optionIndexes }),
    }).catch(() => null);

    const payload = (await response?.json().catch(() => null)) as { poll?: PollView } | null;

    if (payload?.poll) {
      const settled = payload.poll;
      setPolls((current) => current.map((poll) => (poll.id === settled.id ? settled : poll)));
      return;
    }

    setPolls(before);
    setFailed(true);
  }

  async function closePoll(pollId: string) {
    const before = polls;

    setPolls((current) =>
      current.map((poll) => (poll.id === pollId ? { ...poll, isClosed: true } : poll)),
    );

    const response = await fetch(`/api/rooms/${slug}/polls/${pollId}`, { method: "DELETE" }).catch(
      () => null,
    );

    if (!response?.ok) {
      setPolls(before);
      setFailed(true);
      return;
    }

    await refresh();
  }

  async function toggleUpvote(questionId: string) {
    const before = questions;

    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? {
              ...question,
              hasUpvoted: !question.hasUpvoted,
              upvotes: question.upvotes + (question.hasUpvoted ? -1 : 1),
            }
          : question,
      ),
    );

    const response = await fetch(`/api/rooms/${slug}/questions/${questionId}`, {
      method: "POST",
    }).catch(() => null);

    if (!response?.ok) {
      setQuestions(before);
      setFailed(true);
      return;
    }

    await refresh();
  }

  async function markAnswered(questionId: string) {
    const before = questions;

    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId ? { ...question, isAnswered: true } : question,
      ),
    );

    const response = await fetch(`/api/rooms/${slug}/questions/${questionId}`, {
      method: "DELETE",
    }).catch(() => null);

    if (!response?.ok) {
      setQuestions(before);
      setFailed(true);
      return;
    }

    await refresh();
  }

  async function askQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get("body") ?? "").trim();

    if (!body) {
      return;
    }

    form.reset();

    const before = questions;
    // A placeholder id, replaced the moment the refresh brings back the real
    // row. It only has to be unlike any server id for the length of one
    // request.
    const pendingId = `pending-${Date.now()}`;

    setQuestions((current) => [
      ...current,
      {
        id: pendingId,
        body,
        askedByName: askedByName,
        upvotes: 0,
        hasUpvoted: false,
        isAnswered: false,
        createdAt: Date.now(),
      },
    ]);

    const response = await fetch(`/api/rooms/${slug}/questions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    }).catch(() => null);

    if (!response?.ok) {
      setQuestions(before);
      setFailed(true);
      return;
    }

    await refresh();
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {failed ? (
        <p
          className="border-b border-destructive/40 bg-destructive/10 px-4 py-2.5 text-xs text-destructive"
          role="alert"
        >
          {t("engagementFailed")}
        </p>
      ) : null}

      <section className="space-y-3 border-b border-border p-4">
        <header className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t("polls")}</h3>
          {canModerate ? (
            <Button variant="ghost" size="sm" onClick={() => setComposing((open) => !open)}>
              {composing ? <X /> : <Plus />}
              {t("newPoll")}
            </Button>
          ) : null}
        </header>

        {composing ? (
          <PollComposer
            slug={slug}
            onCreated={async (succeeded) => {
              setComposing(false);
              setFailed(!succeeded);

              if (succeeded) {
                await refresh();
              }
            }}
          />
        ) : null}

        {polls.length === 0 && !composing ? (
          <p className="text-sm text-muted-foreground">{t("pollNone")}</p>
        ) : null}

        {polls.map((poll) => (
          <article key={poll.id} className="space-y-2 rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{poll.question}</p>
              {poll.isClosed ? (
                <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[0.625rem] text-muted-foreground uppercase">
                  {t("pollClosed")}
                </span>
              ) : null}
            </div>

            <ul className="space-y-1.5">
              {poll.options.map((option) => {
                const share = poll.totalVoters > 0 ? option.votes / poll.totalVoters : 0;
                const chosen = poll.myVotes.includes(option.index);

                return (
                  <li key={option.index}>
                    <button
                      type="button"
                      disabled={poll.isClosed}
                      onClick={() =>
                        vote(
                          poll.id,
                          poll.allowMultiple
                            ? chosen
                              ? poll.myVotes.filter((index) => index !== option.index)
                              : [...poll.myVotes, option.index]
                            : [option.index],
                        )
                      }
                      className={cn(
                        "relative w-full overflow-hidden rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors disabled:cursor-default",
                        chosen ? "border-signal" : "border-border hover:bg-accent",
                      )}
                    >
                      {/* The bar is behind the label so the number never
                          becomes unreadable as the share grows. */}
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 bg-signal/15"
                        style={{ width: `${Math.round(share * 100)}%` }}
                      />
                      <span className="relative flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 truncate">
                          {chosen ? <Check className="size-3 shrink-0 text-signal" /> : null}
                          {option.label}
                        </span>
                        <span className="tabular shrink-0 text-muted-foreground">
                          {option.votes}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between gap-2">
              <span className="tabular text-[0.625rem] text-muted-foreground">
                {t("pollVotes", { count: poll.totalVoters })}
              </span>
              {canModerate && !poll.isClosed ? (
                <Button variant="ghost" size="sm" onClick={() => closePoll(poll.id)}>
                  {t("pollClose")}
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <section className="flex-1 space-y-3 p-4">
        <h3 className="text-sm font-semibold">{t("questions")}</h3>

        <form onSubmit={askQuestion} className="flex gap-2">
          <Input
            name="body"
            maxLength={QUESTION_MAX_LENGTH}
            placeholder={t("questionPlaceholder")}
            aria-label={t("questionAsk")}
            className="h-9"
          />
          <Button type="submit" size="sm" className="shrink-0">
            {t("questionAsk")}
          </Button>
        </form>

        {questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("questionNone")}</p>
        ) : null}

        <ul className="space-y-2">
          {questions.map((question) => (
            <li
              key={question.id}
              className={cn(
                "flex items-start gap-2 rounded-xl border border-border p-2.5",
                question.isAnswered && "opacity-55",
              )}
            >
              <button
                type="button"
                onClick={() => toggleUpvote(question.id)}
                aria-label={t("questionUpvote")}
                aria-pressed={question.hasUpvoted}
                className={cn(
                  "flex shrink-0 flex-col items-center rounded-lg px-1.5 py-1 transition-colors",
                  question.hasUpvoted
                    ? "bg-signal/15 text-signal"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                <ChevronUp className="size-3.5" />
                <span className="tabular text-[0.625rem]">{question.upvotes}</span>
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-sm break-words">{question.body}</p>
                <p className="mt-0.5 text-[0.625rem] text-muted-foreground">
                  {question.askedByName}
                  {question.isAnswered ? ` · ${t("questionAnswered")}` : ""}
                </p>
              </div>

              {canModerate && !question.isAnswered ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  aria-label={t("questionMarkAnswered")}
                  title={t("questionMarkAnswered")}
                  onClick={() => markAnswered(question.id)}
                >
                  <Check />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function PollComposer({
  slug,
  onCreated,
}: {
  slug: string;
  onCreated: (succeeded: boolean) => void;
}) {
  const t = useTranslations("room");
  const [options, setOptions] = useState<string[]>(Array(POLL_MIN_OPTIONS).fill(""));
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = String(new FormData(event.currentTarget).get("question") ?? "").trim();
    const filled = options.map((option) => option.trim()).filter(Boolean);

    if (!question || filled.length < POLL_MIN_OPTIONS) {
      return;
    }

    setPending(true);

    const response = await fetch(`/api/rooms/${slug}/polls`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, options: filled, allowMultiple, isAnonymous: true }),
    }).catch(() => null);

    setPending(false);
    onCreated(Boolean(response?.ok));
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-border p-3">
      <Field label={t("pollQuestion")} htmlFor={`${slug}-poll-question`}>
        <Input
          id={`${slug}-poll-question`}
          name="question"
          required
          placeholder={t("pollQuestionPlaceholder")}
          className="h-9"
        />
      </Field>

      {options.map((option, index) => (
        <Input
          // Options have no identity of their own; their position is the key.
          // biome-ignore lint/suspicious/noArrayIndexKey: position is the identity here
          key={index}
          value={option}
          onChange={(event) =>
            setOptions((current) =>
              current.map((entry, position) => (position === index ? event.target.value : entry)),
            )
          }
          aria-label={t("pollOption", { index: index + 1 })}
          placeholder={t("pollOption", { index: index + 1 })}
          className="h-9"
        />
      ))}

      {options.length < POLL_MAX_OPTIONS ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOptions((current) => [...current, ""])}
        >
          <Plus />
          {t("pollAddOption")}
        </Button>
      ) : null}

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={allowMultiple}
          onChange={(event) => setAllowMultiple(event.target.checked)}
        />
        {t("pollAllowMultiple")}
      </label>

      <Button type="submit" size="sm" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {t("pollCreate")}
      </Button>
    </form>
  );
}
