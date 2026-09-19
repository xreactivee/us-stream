import "server-only";

import type { ConnectionView } from "@/components/connections-panel";
import { auth } from "@/lib/auth";

export async function loadConnections(
  headers: Headers,
): Promise<{ connections: ConnectionView[]; hasPassword: boolean }> {
  const accounts = await auth.api.listUserAccounts({ headers }).catch(() => []);

  const google = accounts.find((account) => account.providerId === "google");

  return {
    connections: google ? [{ provider: "google", linkId: google.id }] : [],
    hasPassword: accounts.some((account) => account.providerId === "credential"),
  };
}
