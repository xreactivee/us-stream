"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LayoutGrid, LogOut, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "@/lib/auth-client";

export function UserMenu({
  name,
  email,
  image,
}: {
  name: string;
  email: string;
  image?: string | null;
}) {
  const t = useTranslations("nav");
  const router = useRouter();

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t("account")}
        className="grid size-9 place-items-center overflow-hidden rounded-full border border-border bg-secondary text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {image ? (
          <Image
            src={image}
            alt=""
            width={36}
            height={36}
            unoptimized
            className="size-full object-cover"
          />
        ) : (
          initials || "?"
        )}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-2xl shadow-black/30"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>

          <DropdownMenu.Separator className="my-1.5 h-px bg-border" />

          <DropdownMenu.Item asChild>
            <Link
              href="/dashboard"
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none data-highlighted:bg-accent"
            >
              <LayoutGrid className="size-4 text-muted-foreground" />
              {t("dashboard")}
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <Link
              href="/settings"
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none data-highlighted:bg-accent"
            >
              <Settings className="size-4 text-muted-foreground" />
              {t("settings")}
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1.5 h-px bg-border" />

          <DropdownMenu.Item
            onSelect={async () => {
              await signOut();
              router.push("/");
              router.refresh();
            }}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none data-highlighted:bg-accent"
          >
            <LogOut className="size-4 text-muted-foreground" />
            {t("signOut")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
