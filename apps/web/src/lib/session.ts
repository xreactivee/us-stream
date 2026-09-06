import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth, type Session } from "./auth";

export const getSession = cache(async (): Promise<Session | null> => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireSession(returnTo?: string): Promise<Session> {
  const session = await getSession();

  if (!session) {
    const target = returnTo ? `/sign-in?next=${encodeURIComponent(returnTo)}` : "/sign-in";
    redirect(target);
  }

  return session;
}
