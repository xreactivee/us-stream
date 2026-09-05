import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RoomJoin } from "@/components/room-join";
import { Wordmark } from "@/components/wordmark";
import { getRoomBySlug, roleForUser } from "@/lib/rooms";
import { getSession } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/r/[slug]">) {
  const room = await getRoomBySlug((await params).slug);
  return { title: room?.name ?? "us-stream" };
}

export default async function RoomPage({ params }: PageProps<"/r/[slug]">) {
  const { slug } = await params;
  const [room, session, t] = await Promise.all([
    getRoomBySlug(slug),
    getSession(),
    getTranslations("room"),
  ]);

  if (!room) {
    notFound();
  }

  const role = roleForUser(room, session?.user.id);

  return (
    <div className="stage-glow flex min-h-dvh flex-col">
      <header className="px-6 py-6 sm:px-10">
        <Link
          href="/"
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Wordmark />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-20">
        <div className="w-full max-w-md">
          <p className="tabular text-xs tracking-[0.14em] text-muted-foreground uppercase">
            {room.slug}
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-balance">{room.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("joinTitle")}</p>

          <div className="mt-8">
            <RoomJoin
              slug={room.slug}
              requiresPassword={Boolean(room.passwordHash)}
              knownName={session?.user.name ?? null}
              initialRole={role}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
