import { ScheduledMeetingModel, type Types, trusted } from "@us-stream/db";
import { History, Video } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CreateRoomDialog } from "@/components/create-room-dialog";
import { InstantMeetingButton } from "@/components/instant-meeting-button";
import { RoomCard, type RoomSummary } from "@/components/room-card";
import { ScheduleMeetingDialog } from "@/components/schedule-meeting-dialog";
import { ScheduledList, type ScheduledView } from "@/components/scheduled-list";
import { Button } from "@/components/ui/button";
import { connectDb } from "@/lib/db";
import { listRoomsForUser } from "@/lib/rooms";
import { requireSession } from "@/lib/session";

export async function generateMetadata() {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

export default async function DashboardPage() {
  const session = await requireSession("/dashboard");
  const [t, tSchedule, tHistory, rooms] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("schedule"),
    getTranslations("history"),
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

  const scheduled = await loadUpcoming(
    rooms.map((room) => ({ id: room._id, name: room.name, slug: room.slug })),
    session.user.id,
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="ghost">
            <Link href="/history">
              <History />
              {tHistory("title")}
            </Link>
          </Button>
          <ScheduleMeetingDialog
            rooms={summaries.map((room) => ({ id: room.id, name: room.name }))}
          />
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

      <section className="mt-12 space-y-4">
        <h2 className="text-lg font-semibold">{tSchedule("title")}</h2>
        <ScheduledList items={scheduled} />
      </section>
    </div>
  );
}

/**
 * The next few bookings across the rooms this person belongs to.
 *
 * Anything already past is left out rather than deleted: a meeting that
 * happened is history, and the record is small enough not to matter.
 */
async function loadUpcoming(
  rooms: { id: Types.ObjectId; name: string; slug: string }[],
  userId: string,
): Promise<ScheduledView[]> {
  if (rooms.length === 0) {
    return [];
  }

  await connectDb();

  const byId = new Map(rooms.map((room) => [String(room.id), room]));

  const upcoming = await ScheduledMeetingModel.find({
    roomId: trusted({ $in: rooms.map((room) => room.id) }),
    startsAt: trusted({ $gte: new Date() }),
  })
    .sort({ startsAt: 1 })
    .limit(20)
    .lean();

  return upcoming.flatMap((entry) => {
    const room = byId.get(entry.roomId.toString());

    return room
      ? [
          {
            id: String(entry._id),
            title: entry.title,
            roomName: room.name,
            roomSlug: room.slug,
            startsAt: entry.startsAt.getTime(),
            durationMinutes: entry.durationMinutes,
            isMine: entry.createdById === userId,
          },
        ]
      : [];
  });
}
