"use client";

import { useIsSpeaking, useLocalParticipant } from "@livekit/components-react";
import { useEffect, useRef } from "react";

const FLUSH_INTERVAL_MS = 15_000;

export function useSpeakingTime({ slug }: { slug: string }) {
  const { localParticipant } = useLocalParticipant();
  const speaking = useIsSpeaking(localParticipant);

  const pendingMs = useRef(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (speaking) {
      startedAt.current = Date.now();
      return;
    }

    if (startedAt.current !== null) {
      pendingMs.current += Date.now() - startedAt.current;
      startedAt.current = null;
    }
  }, [speaking]);

  useEffect(() => {
    const endpoint = `/api/rooms/${slug}/speaking`;

    function collect(): number {
      // A stretch still in progress counts up to now, then restarts, so a long
      // monologue is not lost by never ending before the flush.
      if (startedAt.current !== null) {
        const now = Date.now();
        pendingMs.current += now - startedAt.current;
        startedAt.current = now;
      }

      const total = Math.round(pendingMs.current);
      pendingMs.current = 0;

      return total;
    }

    async function flush() {
      const speakingMs = collect();

      if (speakingMs <= 0) {
        return;
      }

      await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ speakingMs }),
        keepalive: true,
      }).catch(() => undefined);
    }

    const timer = setInterval(() => void flush(), FLUSH_INTERVAL_MS);

    // `pagehide` rather than `beforeunload`: it is the one that fires reliably
    // on mobile Safari, where a tab is frozen rather than closed.
    function handlePageHide() {
      const speakingMs = collect();

      if (speakingMs > 0) {
        navigator.sendBeacon(
          endpoint,
          new Blob([JSON.stringify({ speakingMs })], {
            type: "application/json",
          }),
        );
      }
    }

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", handlePageHide);
      void flush();
    };
  }, [slug]);
}
