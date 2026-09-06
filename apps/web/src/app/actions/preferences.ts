"use server";

import { LOCALE_COOKIE_NAME, updatePreferencesSchema } from "@us-stream/shared";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export async function setLocalePreference(value: string | null) {
  const cookieStore = await cookies();

  if (value === null) {
    cookieStore.delete(LOCALE_COOKIE_NAME);
  } else {
    const parsed = updatePreferencesSchema.pick({ locale: true }).safeParse({ locale: value });

    if (!parsed.success || !parsed.data.locale) {
      return { ok: false as const, error: "invalid_locale" };
    }

    cookieStore.set(LOCALE_COOKIE_NAME, parsed.data.locale, {
      maxAge: ONE_YEAR_IN_SECONDS,
      sameSite: "lax",
      path: "/",
    });
  }

  const session = await getSession();

  if (session) {
    await auth.api.updateUser({
      headers: await headers(),
      body: { locale: value },
    });
  }

  revalidatePath("/", "layout");

  return { ok: true as const };
}

export async function setThemePreference(value: string) {
  const parsed = updatePreferencesSchema.pick({ theme: true }).safeParse({ theme: value });

  if (!parsed.success || !parsed.data.theme) {
    return { ok: false as const, error: "invalid_theme" };
  }

  const session = await getSession();

  if (session) {
    await auth.api.updateUser({
      headers: await headers(),
      body: { theme: parsed.data.theme },
    });
  }

  return { ok: true as const };
}
