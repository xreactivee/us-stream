import { notFound } from "next/navigation";
import { RoomExperience } from "@/components/call/room-experience";
import { env } from "@/env";
import { getRoomBySlug, roleForUser } from "@/lib/rooms";
import { getSession } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/r/[slug]">) {
  const room = await getRoomBySlug((await params).slug);
  return { title: room?.name ?? "us-stream" };
}

export default async function RoomPage({ params }: PageProps<"/r/[slug]">) {
  const { slug } = await params;
  const [room, session] = await Promise.all([getRoomBySlug(slug), getSession()]);

  if (!room) {
    notFound();
  }

  return (
    <RoomExperience
      slug={room.slug}
      roomTitle={room.name}
      requiresPassword={Boolean(room.passwordHash)}
      knownName={session?.user.name ?? null}
      initialRole={roleForUser(room, session?.user.id)}
      realtimeUrl={env.NEXT_PUBLIC_REALTIME_URL}
    />
  );
}
