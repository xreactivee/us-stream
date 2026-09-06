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

export async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const chosen = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  if (isLocale(chosen)) {
    return chosen;
  }

  const country = (await headers()).get("x-vercel-ip-country");

  return country === TURKISH_COUNTRY_CODE ? "tr" : DEFAULT_LOCALE;
}
