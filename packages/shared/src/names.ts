export function normaliseDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr");
}

export function sameDisplayName(left: string, right: string): boolean {
  return normaliseDisplayName(left) === normaliseDisplayName(right);
}
