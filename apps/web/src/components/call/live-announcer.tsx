"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { FloatingReaction } from "./use-room-events";

/**
 * Says out loud what the call only shows.
 *
 * Reactions float across the video and a raised hand appears as a badge in the
 * header; someone using a screen reader gets neither. This mirrors both into a
 * polite live region, which interrupts nothing but is read when the reader
 * next pauses.
 */
export function LiveAnnouncer({
  reactions,
  handQueueNames,
}: {
  reactions: FloatingReaction[];
  handQueueNames: string[];
}) {
  const t = useTranslations("room");
  const [message, setMessage] = useState("");

  const newestReaction = reactions.at(-1);
  const firstHand = handQueueNames[0];

  useEffect(() => {
    if (newestReaction) {
      setMessage(t("reactionAnnouncement", { name: newestReaction.senderName }));
    }
  }, [newestReaction, t]);

  useEffect(() => {
    if (firstHand) {
      setMessage(t("handRaisedAnnouncement", { name: firstHand }));
    }
  }, [firstHand, t]);

  return (
    <p aria-live="polite" aria-atomic className="sr-only">
      {message}
    </p>
  );
}
