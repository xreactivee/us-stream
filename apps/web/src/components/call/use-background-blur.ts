"use client";

import { useLocalParticipant } from "@livekit/components-react";
import { LocalVideoTrack, Track } from "livekit-client";
import { useEffect } from "react";

export function useBackgroundBlur({
  enabled,
  onUnsupported,
}: {
  enabled: boolean;
  onUnsupported: () => void;
}) {
  const { localParticipant, cameraTrack } = useLocalParticipant();

  useEffect(() => {
    const track = cameraTrack?.track;

    if (!(track instanceof LocalVideoTrack)) {
      return;
    }

    let cancelled = false;

    async function apply(target: LocalVideoTrack) {
      try {
        if (enabled) {
          const { BackgroundBlur } = await import("@livekit/track-processors");

          if (!cancelled) {
            await target.setProcessor(BackgroundBlur(12));
          }
        } else if (target.getProcessor()) {
          await target.stopProcessor();
        }
      } catch {
        if (!cancelled) {
          onUnsupported();
        }
      }
    }

    void apply(track);

    return () => {
      cancelled = true;
    };
  }, [enabled, cameraTrack, onUnsupported]);

  useEffect(() => {
    return () => {
      const track = localParticipant.getTrackPublication(Track.Source.Camera)?.track;

      if (track instanceof LocalVideoTrack && track.getProcessor()) {
        void track.stopProcessor();
      }
    };
  }, [localParticipant]);
}
