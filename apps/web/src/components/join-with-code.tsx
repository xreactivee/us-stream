"use client";

import { ROOM_SLUG_PATTERN } from "@us-stream/shared";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

function extractSlug(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  const fromUrl = trimmed.match(/\/r\/([a-z0-9-]+)/);
  const candidate = fromUrl?.[1] ?? trimmed;

  return ROOM_SLUG_PATTERN.test(candidate) ? candidate : null;
}

export function JoinWithCode() {
  const t = useTranslations("landing");
  const router = useRouter();
  const inputId = useId();
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const slug = extractSlug(value);

    if (!slug) {
      setInvalid(true);
      return;
    }

    router.push(`/r/${slug}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-2">
      <Label htmlFor={inputId}>{t("codeLabel")}</Label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setInvalid(false);
          }}
          placeholder={t("codePlaceholder")}
          aria-invalid={invalid}
          autoComplete="off"
          spellCheck={false}
          className="tabular"
        />
        <Button type="submit" variant="outline" size="md" aria-label={t("join")}>
          <ArrowRight />
        </Button>
      </div>
    </form>
  );
}
