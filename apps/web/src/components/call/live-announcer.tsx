"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { FloatingReaction } from "./use-room-events";

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
