"use client";

import { useParticipants } from "@livekit/components-react";
import { CHAT_MESSAGE_MAX_LENGTH } from "@us-stream/shared";
import { Send, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "./use-room-events";

export function ChatPanel({
  messages,
  localIdentity,
  privateTo,
  onSetPrivateTo,
  onSend,
}: {
  messages: ChatMessage[];
  localIdentity: string;
  privateTo: string | null;
  onSetPrivateTo: (identity: string | null) => void;
  onSend: (body: string, toIdentity: string | null) => void;
}) {
  const t = useTranslations("room");
  const format = useFormatter();
  const participants = useParticipants();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastCount = useRef(0);

  // Follow the conversation, but only when it actually grows — scrolling on
  // every re-render would yank the list away from someone reading it.
  useEffect(() => {
    if (messages.length > lastCount.current) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }

    lastCount.current = messages.length;
  }, [messages.length]);

  const privateToName = privateTo
    ? (participants.find((participant) => participant.identity === privateTo)?.name ?? privateTo)
    : null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();

    if (body.length === 0) {
      return;
    }

    onSend(body, privateTo);
    setDraft("");
  }

  return (
    <div className="flex h-full flex-col">
      <ul className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <li className="text-sm text-muted-foreground">{t("noMessages")}</li>
        ) : (
          messages.map((message) => {
            const mine = message.senderIdentity === localIdentity;

            return (
              <li key={message.id} className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-xs font-medium", mine && "text-signal")}>
                    {mine ? t("you") : message.senderName}
                  </span>
                  <span className="tabular text-[0.625rem] text-muted-foreground">
                    {format.dateTime(new Date(message.sentAt), {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {message.toIdentity ? (
                    <span className="rounded bg-signal/15 px-1.5 py-0.5 text-[0.625rem] text-signal">
                      {t("privateBadge")}
                    </span>
                  ) : null}
                </div>

                <p className="text-sm break-words whitespace-pre-wrap text-foreground/90">
                  {message.body}
                </p>

                {!mine ? (
                  <button
                    type="button"
                    onClick={() => onSetPrivateTo(message.senderIdentity)}
                    className="text-[0.625rem] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    {t("replyPrivately")}
                  </button>
                ) : null}
              </li>
            );
          })
        )}
        <div ref={bottomRef} />
      </ul>

      <form onSubmit={handleSubmit} className="space-y-2 border-t border-border p-3">
        {privateToName ? (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-signal/10 px-2.5 py-1.5 text-xs text-signal">
            <span className="truncate">{t("privateTo", { name: privateToName })}</span>
            <button
              type="button"
              onClick={() => onSetPrivateTo(null)}
              aria-label={t("cancelPrivate")}
              title={t("cancelPrivate")}
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}

        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={CHAT_MESSAGE_MAX_LENGTH}
            placeholder={t("chatPlaceholder")}
            aria-label={t("chatPlaceholder")}
            autoComplete="off"
            className="h-10"
          />
          <Button type="submit" size="icon" aria-label={t("send")} className="size-10 shrink-0">
            <Send />
          </Button>
        </div>
      </form>
    </div>
  );
}
