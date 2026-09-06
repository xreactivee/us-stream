import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-display text-lg font-semibold",
        className,
      )}
    >
      <span
        aria-hidden
        className="size-2 rounded-full bg-signal [animation:var(--animate-on-air)]"
      />
      us-stream
    </span>
  );
}
