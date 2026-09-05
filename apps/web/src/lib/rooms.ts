import "server-only";

import { deleteRoomAndChildren, type Room, RoomModel, Types } from "@us-stream/db";
import {
  type CreateRoomInput,
  DEFAULT_MAX_PARTICIPANTS,
  generateRoomSlug,
  type Locale,
  type Role,
  type UpdateRoomInput,
} from "@us-stream/shared";
import { connectDb } from "./db";
import { hashRoomPassword } from "./password";

/** Disposable rooms disappear a day after they are made. */
const DISPOSABLE_ROOM_LIFETIME_MS = 24 * 60 * 60 * 1000;

export type RoomDocument = Room;

/**
 * The role a signed-in user holds in a room. Everyone else — including a
 * signed-in user who has never been added — is a guest, which is the correct
 * default: a room is joinable by link, so being unknown is normal rather than
 * an error.
 */
export function roleForUser(room: Pick<Room, "ownerId" | "members">, userId?: string | null): Role {
  if (!userId) {
    return "guest";
  }

  if (room.ownerId === userId) {
    return "owner";
  }

  return room.members.find((member) => member.userId === userId)?.role ?? "guest";
}

export async function createRoomForUser(
  userId: string,
  input: CreateRoomInput,
  locale: Locale,
): Promise<Room> {
  await connectDb();

  const passwordHash = input.password ? await hashRoomPassword(input.password) : null;

  // Slugs are two words and a number, so collisions are rare but possible.
  // Retrying is cheaper than coordinating a global counter.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = generateRoomSlug(locale);

    if (await RoomModel.exists({ slug })) {
      continue;
    }

    const created = await RoomModel.create({
      slug,
      name: input.name,
      ownerId: userId,
      isPersistent: input.isPersistent,
      passwordHash,
      waitingRoomEnabled: input.waitingRoomEnabled,
      e2eeEnabled: input.e2eeEnabled,
      maxParticipants: input.maxParticipants ?? DEFAULT_MAX_PARTICIPANTS,
      members: [],
      expiresAt: input.isPersistent ? null : new Date(Date.now() + DISPOSABLE_ROOM_LIFETIME_MS),
    });

    return created.toObject<Room>();
  }

  throw new Error("Could not allocate a unique room slug after 8 attempts");
}

export async function getRoomBySlug(slug: string): Promise<Room | null> {
  await connectDb();
  return RoomModel.findOne({ slug }).lean<Room>();
}

export async function getRoomById(id: string): Promise<Room | null> {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }

  await connectDb();
  return RoomModel.findById(id).lean<Room>();
}

export async function listRoomsForUser(userId: string): Promise<Room[]> {
  await connectDb();

  return RoomModel.find({
    $or: [{ ownerId: userId }, { "members.userId": userId }],
  })
    .sort({ updatedAt: -1 })
    .lean<Room[]>();
}

export async function updateRoom(
  roomId: Types.ObjectId,
  input: UpdateRoomInput,
): Promise<Room | null> {
  await connectDb();

  const update: Record<string, unknown> = {};

  for (const key of [
    "name",
    "isPersistent",
    "waitingRoomEnabled",
    "isLocked",
    "e2eeEnabled",
    "maxParticipants",
  ] as const) {
    if (input[key] !== undefined) {
      update[key] = input[key];
    }
  }

  // An explicit null clears the password; leaving it out keeps the current one.
  if (input.password !== undefined) {
    update.passwordHash = input.password ? await hashRoomPassword(input.password) : null;
  }

  return RoomModel.findByIdAndUpdate(roomId, update, { new: true }).lean<Room>();
}

/** Removes the room together with its meetings, chat, polls and documents. */
export async function deleteRoom(roomId: Types.ObjectId): Promise<void> {
  await connectDb();
  await deleteRoomAndChildren(roomId);
}
