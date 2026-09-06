"use client";

import { Check, Loader2, Unlink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { GoogleMark } from "@/components/google-mark";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export interface ConnectionView {
  provider: "google";

  linkId: string;
}

export function ConnectionsPanel({
  connections,
  canUnlink,
}: {
  connections: ConnectionView[];

  canUnlink: boolean;
}) {
  const t = useTranslations("connections");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const google = connections.find((connection) => connection.provider === "google");

  async function connect() {
    setPending(true);
    setFailed(false);

    const result = await authClient.linkSocial({
      provider: "google",
      callbackURL: "/dashboard",
    });

    if (result.error) {
      setFailed(true);
      setPending(false);
    }
  }

  async function disconnect() {
    if (!google || !window.confirm(t("disconnectConfirm"))) {
      return;
    }

    setPending(true);
    setFailed(false);

    const result = await authClient.unlinkAccount({ accountId: google.linkId });

    setPending(false);

    if (result.error) {
      setFailed(true);
      return;
    }

    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-4 px-5 py-4">
        <GoogleMark />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Google</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {google ? t("connectedHint") : t("connectHint")}
          </p>
        </div>

        {google ? (
          <>
            <span className="flex items-center gap-1.5 text-xs text-connected">
              <Check className="size-3.5" aria-hidden />
              {t("connected")}
            </span>

            {canUnlink ? (
              <Button variant="ghost" size="sm" disabled={pending} onClick={disconnect}>
                {pending ? <Loader2 className="animate-spin" /> : <Unlink />}
                {t("disconnect")}
              </Button>
            ) : null}
          </>
        ) : (
          <Button variant="outline" size="sm" disabled={pending} onClick={connect}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {t("connect")}
          </Button>
        )}
      </div>

      {failed ? (
        <p className="border-t border-border px-5 py-3 text-sm text-destructive" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
}
