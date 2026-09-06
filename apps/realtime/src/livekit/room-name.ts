import { Types } from "@us-stream/db";

export function roomIdFromName(name: string | undefined): Types.ObjectId | null {
  const id = name?.startsWith("room_") ? name.slice("room_".length) : null;

  return id && Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
}
