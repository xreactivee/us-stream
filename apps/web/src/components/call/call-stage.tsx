"use client";

import { type TrackReferenceOrPlaceholder, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { VideoTile } from "./video-tile";

function keyFor(trackRef: TrackReferenceOrPlaceholder): string {
  return `${trackRef.participant.identity}:${trackRef.source}`;
}

/** Column count that keeps tiles as close to 16:9 as the count allows. */
function columnsFor(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count <= 4) return "grid-cols-1 sm:grid-cols-2";
  if (count <= 9) return "grid-cols-2 lg:grid-cols-3";
  return "grid-cols-2 lg:grid-cols-4";
}

export function CallStage({
  pinnedKey,
  onTogglePin,
  canModerate,
  actorOutranks,
  onModerate,
  layout = "full",
}: {
  pinnedKey: string | null;
  onTogglePin: (key: string | null) => void;
  canModerate: boolean;
  actorOutranks: (identity: string) => boolean;
  onModerate: (action: "mute" | "remove", identity: string, name: string) => void;
  /**
   * `strip` is used when the whiteboard or the notes hold the stage: faces stay
   * visible along one edge instead of competing with the thing being worked on.
   */
  layout?: "full" | "strip";
}) {
  const tracks = useTracks(
    [
      // The placeholder keeps someone with their camera off in the layout —
      // they are still in the room and still speaking.
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const { focused, others } = useMemo(() => {
    const screenShare = tracks.find((track) => track.source === Track.Source.ScreenShare);
    // An explicit pin always wins; otherwise a shared screen takes the stage,
    // because that is what everyone is looking at.
    const pinned = pinnedKey ? tracks.find((track) => keyFor(track) === pinnedKey) : undefined;
    const focus = pinned ?? screenShare ?? null;

    return {
      focused: focus,
      others: focus ? tracks.filter((track) => keyFor(track) !== keyFor(focus)) : tracks,
    };
  }, [tracks, pinnedKey]);

  const tileProps = { canModerate, actorOutranks, onModerate };

  if (layout === "strip") {
    return (
      <div className="flex h-full gap-3 overflow-x-auto">
        {tracks.map((trackRef) => (
          <div key={keyFor(trackRef)} className="aspect-video h-full shrink-0">
            <VideoTile
              trackRef={trackRef}
              isPinned={false}
              onTogglePin={() => onTogglePin(keyFor(trackRef))}
              {...tileProps}
            />
          </div>
        ))}
      </div>
    );
  }

  if (focused) {
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="min-h-0 flex-1">
          <VideoTile
            trackRef={focused}
            isPinned={pinnedKey === keyFor(focused)}
            onTogglePin={() => onTogglePin(pinnedKey === keyFor(focused) ? null : keyFor(focused))}
            {...tileProps}
          />
        </div>

        {others.length > 0 ? (
          <div className="flex shrink-0 gap-3 overflow-x-auto pb-1">
            {others.map((trackRef) => (
              <div key={keyFor(trackRef)} className="aspect-video w-44 shrink-0">
                <VideoTile
                  trackRef={trackRef}
                  isPinned={false}
                  onTogglePin={() => onTogglePin(keyFor(trackRef))}
                  {...tileProps}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("grid h-full auto-rows-fr gap-3", columnsFor(tracks.length))}>
      {tracks.map((trackRef) => (
        <VideoTile
          key={keyFor(trackRef)}
          trackRef={trackRef}
          isPinned={false}
          onTogglePin={() => onTogglePin(keyFor(trackRef))}
          {...tileProps}
        />
      ))}
    </div>
  );
}
