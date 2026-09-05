const DEFAULT_DESTINATION = "/dashboard";

/**
 * Sanitises a `?next=` value before it is used as a redirect target.
 *
 * Only same-origin absolute paths are allowed. Anything else — a full URL, a
 * protocol-relative `//evil.example`, a backslash the browser normalises into
 * a slash — would turn the sign-in page into an open redirect that sends
 * people somewhere else with our name on the link.
 */
export function safeNextPath(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate || !candidate.startsWith("/")) {
    return DEFAULT_DESTINATION;
  }

  if (candidate.startsWith("//") || candidate.startsWith("/\\") || candidate.includes("\\")) {
    return DEFAULT_DESTINATION;
  }

  return candidate;
}
