export function bytesOf(value: unknown): Uint8Array {
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
