/**
 * Recognising one person across two visits.
 *
 * A guest has no account, so the only thing that connects the person who left
 * with the person who came back is the name they typed. Comparing those two
 * strings exactly would fail on a stray space or a shifted capital, and each
 * failure means one participant appearing twice in a meeting's history.
 *
 * Case folding is Turkish-aware, because the alternative gets dotted and
 * dotless I wrong — "İLKE" and "ilke" are the same name and "IRMAK" and
 * "ırmak" are too, neither of which the default rules produce.
 */
export function normaliseDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr");
}

/** Whether two typed names should be treated as the same person. */
export function sameDisplayName(left: string, right: string): boolean {
  return normaliseDisplayName(left) === normaliseDisplayName(right);
}
