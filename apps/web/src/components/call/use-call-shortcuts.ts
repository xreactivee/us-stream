"use client";

import { useLocalParticipant } from "@livekit/components-react";
import { useEffect, useState } from "react";

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;

  return Boolean(
    element &&
      (element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA" ||
        element.tagName === "SELECT" ||
        element.isContentEditable),
  );
}

export function useCallShortcuts({
  onOpenPanel,
}: {
  onOpenPanel: (
    update: (
      current: "participants" | "chat" | "engage" | null,
    ) => "participants" | "chat" | "engage" | null,
  ) => void;
}) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();
  const [pushToTalkActive, setPushToTalkActive] = useState(false);

  useEffect(() => {
    let temporarilyUnmuted = false;

    function handleKeyDown(event: KeyboardEvent) {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();

        if (!isMicrophoneEnabled && !temporarilyUnmuted) {
          temporarilyUnmuted = true;
          setPushToTalkActive(true);
          void localParticipant.setMicrophoneEnabled(true);
        }
        return;
      }

      switch (event.key.toLowerCase()) {
        case "m":
          event.preventDefault();
          void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
          break;
        case "v":
          event.preventDefault();
          void localParticipant.setCameraEnabled(!isCameraEnabled);
          break;
        case "s":
          event.preventDefault();
          void localParticipant.setScreenShareEnabled(!isScreenShareEnabled, { audio: true });
          break;
        case "p":
          event.preventDefault();
          onOpenPanel((current) => (current === "participants" ? null : "participants"));
          break;
        case "c":
          event.preventDefault();
          onOpenPanel((current) => (current === "chat" ? null : "chat"));
          break;
        default:
          break;
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space" && temporarilyUnmuted) {
        temporarilyUnmuted = false;
        setPushToTalkActive(false);
        void localParticipant.setMicrophoneEnabled(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled, localParticipant, onOpenPanel]);

  return { pushToTalkActive };
}
