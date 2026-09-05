import "server-only";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALES,
  type Locale,
  TURKISH_COUNTRY_CODE,
} from "@us-stream/shared";
import { cookies, headers } from "next/headers";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Resolves the language for the current request.
 *
 * An explicit choice always wins: once someone picks a language in settings it
 * is stored in a cookie and nothing overrides it. Otherwise the visitor's
 * country decides — Turkey gets Turkish, everywhere else gets English.
 *
 * There is no locale segment in the URL on purpose. A room invite is shared
 * between people who may not read the same language, and `/r/mavi-kedi-4821`
 * should open in the recipient's language rather than the sender's.
 */
export async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const chosen = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  if (isLocale(chosen)) {
    return chosen;
  }

  // Set by Vercel's edge network. Absent in local development, which then
  // falls through to the default.
  const country = (await headers()).get("x-vercel-ip-country");

  return country === TURKISH_COUNTRY_CODE ? "tr" : DEFAULT_LOCALE;
}
