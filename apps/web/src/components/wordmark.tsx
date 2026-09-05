import { cn } from "@/lib/utils";

/**
 * The name with its on-air lamp. The pulsing dot is the product's one
 * recurring signature — it reappears on active speakers and live rooms — so it
 * belongs in the wordmark too.
 */
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
