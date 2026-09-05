import type { ReactNode } from "react";

/**
 * Shared shell for the privacy policy and the terms. Both are plain prose
 * documents; they exist as real pages because Google requires working policy
 * URLs before an OAuth consent screen can be published.
 */
export function LegalPage({
  title,
  updatedLabel,
  updatedOn,
  children,
}: {
  title: string;
  updatedLabel: string;
  updatedOn: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-4xl font-semibold">{title}</h1>
      <p className="tabular mt-3 text-xs tracking-[0.12em] text-muted-foreground uppercase">
        {updatedLabel} · {updatedOn}
      </p>

      <div className="mt-10 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground [&_ul]:space-y-2">
        {children}
      </div>
    </article>
  );
}
