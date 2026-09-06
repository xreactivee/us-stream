const DEFAULT_DESTINATION = "/dashboard";

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
