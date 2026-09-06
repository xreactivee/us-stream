/**
 * Normalises whatever the driver hands back for a binary field.
 *
 * A hydrated Mongoose document yields a Node `Buffer`, but `.lean()` yields the
 * driver's `Binary` wrapper, whose `length` is a *method* — so a naive
 * `state.length > 0` check silently reads false and the document loads empty.
 * That failure is invisible until the second time somebody opens the board,
 * which is exactly how it was found.
 *
 * Lives here rather than beside one caller because both the realtime service
 * and the web app read the same stored documents.
 */
export function bytesOf(value: unknown): Uint8Array {
  // Buffer is already a Uint8Array, which covers the hydrated case.
  if (value instanceof Uint8Array) {
    return value;
  }

  const binary = value as { buffer?: unknown; value?: () => Uint8Array } | null;

  if (typeof binary?.value === "function") {
    return new Uint8Array(binary.value());
  }

  if (binary?.buffer instanceof Uint8Array) {
    return new Uint8Array(binary.buffer);
  }

  return new Uint8Array();
}
