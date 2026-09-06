"use client";

import { Loader2, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { createInstantRoomAction } from "@/app/actions/rooms";
import { Button } from "@/components/ui/button";

export function InstantMeetingButton() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const result = await createInstantRoomAction(t("instantName"));

        if (result.ok) {
          router.push(`/r/${result.slug}`);
          return;
        }

        setPending(false);
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Video />}
      {t("instantMeeting")}
    </Button>
  );
}
