import { Types } from "@us-stream/db";

/**
 * LiveKit room names are `room_<ObjectId>`.
 *
 * The name arrives inside a webhook payload, so it is untrusted input even
 * though the signature is verified: a breakout sub-room, a room created
 * directly through the LiveKit dashboard, or a future naming scheme all reach
 * this function. Anything that is not one of ours returns null and is ignored
 * rather than treated as an error.
 *
 * Kept apart from the webhook handler so it can be tested without the
 * service's environment.
 */
export function roomIdFromName(name: string | undefined): Types.ObjectId | null {
  const id = name?.startsWith("room_") ? name.slice("room_".length) : null;

  return id && Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
}
