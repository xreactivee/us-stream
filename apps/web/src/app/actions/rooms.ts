"use server";

import { isValidObjectId, Types } from "@us-stream/db";
import { createRoomSchema, updateRoomSchema } from "@us-stream/shared";
import { revalidatePath } from "next/cache";
import { resolveLocale } from "@/i18n/locale";
import {
  createRoomForUser,
  deleteRoom,
  getRoomById,
  getRoomBySlug,
  roleForUser,
  updateRoom,
} from "@/lib/rooms";
import { requireSession } from "@/lib/session";

/**
 * What every action in this file returns. Failures carry a code the client
 * translates, never a raw message — a server error string has no place in the
 * interface and can leak internals.
 */
export type ActionResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

export async function createRoomAction(input: unknown): Promise<ActionResult<{ slug: string }>> {
  const session = await requireSession("/dashboard");
  const parsed = createRoomSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "invalid_input" };
  }

  const locale = await resolveLocale();
  const room = await createRoomForUser(session.user.id, parsed.data, locale);

  revalidatePath("/dashboard");

  return { ok: true, slug: room.slug };
}

/**
 * A one-off meeting: a disposable room with a generated name that expires on
 * its own a day later, so the dashboard does not fill up with them.
 */
export async function createInstantRoomAction(
  name: string,
): Promise<ActionResult<{ slug: string }>> {
  return createRoomAction({
    name,
    isPersistent: false,
    waitingRoomEnabled: false,
    e2eeEnabled: false,
  });
}

export async function updateRoomAction(slug: string, input: unknown): Promise<ActionResult> {
  const session = await requireSession("/dashboard");
  const parsed = updateRoomSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "invalid_input" };
  }

  const room = await getRoomBySlug(slug);

  if (!room) {
    return { ok: false, error: "not_found" };
  }

  if (roleForUser(room, session.user.id) !== "owner") {
    return { ok: false, error: "forbidden" };
  }

  await updateRoom(room._id, parsed.data);
  revalidatePath("/dashboard");

  return { ok: true };
}

export async function deleteRoomAction(roomId: string): Promise<ActionResult> {
  const session = await requireSession("/dashboard");

  if (!isValidObjectId(roomId)) {
    return { ok: false, error: "invalid_input" };
  }

  const room = await getRoomById(roomId);

  if (!room) {
    return { ok: false, error: "not_found" };
  }

  // Only the owner may delete. A cohost can run the meeting but not destroy
  // the room and everything recorded against it.
  if (room.ownerId !== session.user.id) {
    return { ok: false, error: "forbidden" };
  }

  await deleteRoom(new Types.ObjectId(roomId));
  revalidatePath("/dashboard");

  return { ok: true };
}
