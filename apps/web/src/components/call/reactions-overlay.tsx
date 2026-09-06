"use client";

import type { FloatingReaction } from "@/types";

export function ReactionsOverlay({ reactions }: { reactions: FloatingReaction[] }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-64 overflow-hidden">
      {reactions.map((reaction, index) => (
        <span
          key={reaction.id}
          className="absolute bottom-0 flex flex-col items-center gap-1 animate-[float-up_4s_ease-out_forwards]"
          style={{ left: `${8 + ((index * 17) % 78)}%` }}
        >
          <span className="text-3xl drop-shadow-lg">{reaction.emoji}</span>
          <span className="max-w-24 truncate rounded-full bg-black/50 px-2 py-0.5 text-[0.625rem] text-white">
            {reaction.senderName}
          </span>
        </span>
      ))}
    </div>
  );
}
