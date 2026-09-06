"use client";

import { useConnectionQualityIndicator, useLocalParticipant } from "@livekit/components-react";
import { ConnectionQuality } from "livekit-client";
import { VideoOff, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ConnectionNotice() {
  const t = useTranslations("room");
  const { localParticipant, isCameraEnabled } = useLocalParticipant();

  const { quality } = useConnectionQualityIndicator({ participant: localParticipant });
  const [dismissed, setDismissed] = useState(false);

  const poor = quality === ConnectionQuality.Poor;

  useEffect(() => {
    if (!poor) {
      setDismissed(false);
    }
  }, [poor]);

  if (!poor || dismissed || !isCameraEnabled) {
    return null;
  }

  return (
    <output className="flex flex-wrap items-center gap-3 rounded-xl border border-degraded/40 bg-degraded/10 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{t("lowBandwidthTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("lowBandwidthBody")}</p>
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          void localParticipant.setCameraEnabled(false);
          setDismissed(true);
        }}
      >
        <VideoOff />
        {t("lowBandwidthAction")}
      </Button>

      <Button
        size="icon"
        variant="ghost"
        className="size-8"
        aria-label={t("dismiss")}
        onClick={() => setDismissed(true)}
      >
        <X />
      </Button>
    </output>
  );
}
