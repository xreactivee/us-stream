import { Video } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CreateRoomDialog } from "@/components/create-room-dialog";
import { InstantMeetingButton } from "@/components/instant-meeting-button";
import { RoomCard, type RoomSummary } from "@/components/room-card";
import { listRoomsForUser } from "@/lib/rooms";
import { requireSession } from "@/lib/session";

export async function generateMetadata() {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

export default async function DashboardPage() {
  const session = await requireSession("/dashboard");
  const [t, rooms] = await Promise.all([
    getTranslations("dashboard"),
    listRoomsForUser(session.user.id),
  ]);

  const summaries: RoomSummary[] = rooms.map((room) => ({
    id: String(room._id),
    slug: room.slug,
    name: room.name,
    isPersistent: room.isPersistent,
    isLocked: room.isLocked,
    // The hash itself never leaves the server; the client only needs to know
    // that a password exists.
    hasPassword: Boolean(room.passwordHash),
    waitingRoomEnabled: room.waitingRoomEnabled,
    isOwner: room.ownerId === session.user.id,
  }));

  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="flex gap-2">
          <CreateRoomDialog />
          <InstantMeetingButton />
        </div>
      </header>

      {summaries.length === 0 ? (
        <section className="mt-10 rounded-2xl border border-dashed border-border bg-card/40 px-8 py-16 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-secondary">
            <Video className="size-5 text-muted-foreground" aria-hidden />
          </span>
          <h2 className="mt-5 text-lg font-semibold">{t("emptyTitle")}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-pretty text-muted-foreground">
            {t("emptyBody")}
          </p>
        </section>
      ) : (
        <section className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </section>
      )}
    </div>
  );
}
