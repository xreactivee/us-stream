import Link from "next/link";

/**
 * Placeholder landing page for phase 0. It exists to prove the design tokens,
 * fonts and theme wiring work end to end; phase 1 replaces the copy with
 * translated strings and wires the buttons to real routes.
 */
export default function Home() {
  return (
    <main className="stage-glow flex min-h-dvh flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-2xl">
        <span className="inline-flex items-center gap-2.5 rounded-full border border-border bg-card/60 py-1.5 pr-4 pl-3 text-xs tracking-[0.14em] uppercase text-muted-foreground backdrop-blur">
          <span className="size-2 rounded-full bg-signal [animation:var(--animate-on-air)]" />
          phase 0 · skeleton
        </span>

        <h1 className="mt-8 text-5xl leading-[0.95] font-semibold sm:text-7xl">us-stream</h1>

        <p className="mt-6 max-w-lg text-lg text-muted-foreground text-pretty">
          Rooms for video, audio and screen sharing — with chat, a shared whiteboard and breakout
          rooms. Self-hosted, and yours.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-lg bg-primary px-6 font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Start a meeting
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-lg border border-border px-6 font-medium transition-colors hover:bg-accent"
          >
            Join with a code
          </Link>
        </div>

        <dl className="mt-16 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {[
            { label: "Media", value: "LiveKit" },
            { label: "Web", value: "Next.js 16" },
            { label: "Realtime", value: "Fastify · Yjs" },
          ].map((item) => (
            <div key={item.label} className="bg-card px-5 py-4">
              <dt className="text-xs tracking-[0.12em] uppercase text-muted-foreground">
                {item.label}
              </dt>
              <dd className="tabular mt-1 text-sm">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </main>
  );
}
