"use client";

import { useLocalParticipant } from "@livekit/components-react";
import { LocalVideoTrack, Track } from "livekit-client";
import { useEffect } from "react";

/**
 * Background blur on the local camera.
 *
 * Runs entirely in the browser through `@livekit/track-processors`: the frames
 * are segmented on this machine and nothing extra is sent anywhere.
 *
 * The processor is loaded on demand rather than imported at the top of the
 * module. It pulls in a segmentation model that is large next to the rest of
 * the app, and most calls never turn blur on — there is no reason to make
 * everyone download it to find that out.
 */
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

    // `setProcessor` belongs to the local video track, not to the base class,
    // so the narrowing has to happen before anything is awaited.
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
        // A device without the WebGL or WASM support the segmenter needs
        // should lose the button, not the call.
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

  /** Stops the processor before the track goes away, so no worker is left running. */
  useEffect(() => {
    return () => {
      const track = localParticipant.getTrackPublication(Track.Source.Camera)?.track;

      if (track instanceof LocalVideoTrack && track.getProcessor()) {
        void track.stopProcessor();
      }
    };
  }, [localParticipant]);
}
