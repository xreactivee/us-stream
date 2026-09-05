import websocket from "@fastify/websocket";
import { Types } from "@us-stream/db";
import { DOC_KINDS, type DocKind } from "@us-stream/shared";
import type { FastifyInstance } from "fastify";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import { TokenVerifier } from "livekit-server-sdk";
import { applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import { readSyncMessage, writeSyncStep1 } from "y-protocols/sync";
import { env } from "../env";
import {
  type DocConnection,
  detachConnection,
  getSharedDoc,
  MESSAGE_AWARENESS,
  MESSAGE_SYNC,
  releaseIfEmpty,
  type SharedDoc,
  startSnapshots,
} from "./registry";

const verifier = new TokenVerifier(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);

/** A client that floods us while we are still opening its document is dropped. */
const MAX_PENDING_FRAMES = 64;

/** Room names are `room_<ObjectId>`, the same shape the token endpoint issues. */
function roomIdFromToken(roomName: string | undefined): Types.ObjectId | null {
  const id = roomName?.startsWith("room_") ? roomName.slice("room_".length) : null;

  return id && Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
}

function isDocKind(value: string | undefined): value is DocKind {
  return value !== undefined && (DOC_KINDS as readonly string[]).includes(value);
}

/**
 * Collaborative documents over WebSocket.
 *
 * Authorisation reuses the LiveKit access token rather than inventing a second
 * one. That token already proves its holder was admitted to this room — it got
 * past the password, the lock and the waiting room — and it names both the
 * room and the participant. Verifying it here with the same API secret means
 * the whiteboard cannot be opened by anyone who could not join the call, and
 * there is no second credential to keep in step with the first.
 */
export async function registerYjsRoute(app: FastifyInstance) {
  await app.register(websocket, {
    // A pasted image or a dense drawing makes for large sync messages.
    options: { maxPayload: 8 * 1024 * 1024 },
  });

  app.get<{ Querystring: { token?: string; kind?: string } }>(
    "/yjs",
    { websocket: true },
    (socket, request) => {
      /*
       * The message listener is attached before anything is awaited, and
       * frames that arrive during setup are queued.
       *
       * y-websocket sends its first sync message the instant the socket opens.
       * Verifying the token and loading the document both take a turn of the
       * event loop, and a listener attached after them misses that first
       * message — the client then waits forever for a reply to a question we
       * never heard.
       */
      const pending: Buffer[] = [];
      let ready: { shared: SharedDoc; connection: DocConnection } | null = null;
      let closed = false;

      const handleFrame = (raw: Buffer) => {
        if (!ready) {
          return;
        }

        const { shared, connection } = ready;

        try {
          const decoder = decoding.createDecoder(new Uint8Array(raw));
          const encoder = encoding.createEncoder();
          const messageType = decoding.readVarUint(decoder);

          if (messageType === MESSAGE_SYNC) {
            encoding.writeVarUint(encoder, MESSAGE_SYNC);
            readSyncMessage(decoder, encoder, shared.doc, connection);

            // A reply exists only when the client asked a question; a bare
            // type byte means there is nothing to send back.
            if (encoding.length(encoder) > 1) {
              connection.send(encoding.toUint8Array(encoder));
            }
          } else if (messageType === MESSAGE_AWARENESS) {
            applyAwarenessUpdate(shared.awareness, decoding.readVarUint8Array(decoder), connection);
          }
        } catch (error) {
          // A malformed frame from one client must not take the room's
          // document down for everyone else.
          request.log.warn({ error }, "discarded a malformed Yjs frame");
        }
      };

      socket.on("message", (raw: Buffer) => {
        if (ready) {
          handleFrame(raw);
          return;
        }

        if (pending.length >= MAX_PENDING_FRAMES) {
          socket.close(4429, "too_many_pending_frames");
          return;
        }

        pending.push(raw);
      });

      socket.on("close", () => {
        closed = true;

        if (ready) {
          detachConnection(ready.shared, ready.connection);
          void releaseIfEmpty(ready.shared);
        }
      });

      void (async () => {
        const { token, kind } = request.query;

        if (!token || !isDocKind(kind)) {
          socket.close(4400, "bad_request");
          return;
        }

        let roomId: Types.ObjectId | null = null;

        try {
          const claims = await verifier.verify(token);
          roomId = roomIdFromToken(claims.video?.room);

          if (!claims.sub) {
            roomId = null;
          }
        } catch {
          socket.close(4401, "invalid_token");
          return;
        }

        if (!roomId) {
          socket.close(4401, "invalid_token");
          return;
        }

        const shared = await getSharedDoc(roomId, kind);

        // The socket may have gone while the document was loading.
        if (closed) {
          await releaseIfEmpty(shared);
          return;
        }

        const connection: DocConnection = {
          send: (data) => {
            if (socket.readyState === socket.OPEN) {
              socket.send(data);
            }
          },
          controlledIds: new Set<number>(),
        };

        shared.connections.add(connection);
        startSnapshots(shared);
        ready = { shared, connection };

        // Opening handshake: ask the client what it already has, then hand it
        // everyone's current presence.
        const syncEncoder = encoding.createEncoder();
        encoding.writeVarUint(syncEncoder, MESSAGE_SYNC);
        writeSyncStep1(syncEncoder, shared.doc);
        connection.send(encoding.toUint8Array(syncEncoder));

        const states = shared.awareness.getStates();

        if (states.size > 0) {
          const awarenessEncoder = encoding.createEncoder();
          encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
          encoding.writeVarUint8Array(
            awarenessEncoder,
            encodeAwarenessUpdate(shared.awareness, [...states.keys()]),
          );
          connection.send(encoding.toUint8Array(awarenessEncoder));
        }

        // Anything said while we were opening the document is answered now.
        for (const raw of pending) {
          handleFrame(raw);
        }

        pending.length = 0;
      })();
    },
  );
}
