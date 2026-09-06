import websocket from "@fastify/websocket";
import type { Types } from "@us-stream/db";
import { DOC_KINDS, type DocKind } from "@us-stream/shared";
import type { FastifyInstance } from "fastify";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import { TokenVerifier } from "livekit-server-sdk";
import { applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import { readSyncMessage, writeSyncStep1 } from "y-protocols/sync";
import { env } from "../env";
import { roomIdFromName } from "../livekit/room-name";
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

const MAX_PENDING_FRAMES = 64;

function isDocKind(value: string | undefined): value is DocKind {
  return value !== undefined && (DOC_KINDS as readonly string[]).includes(value);
}

export async function registerYjsRoute(app: FastifyInstance) {
  await app.register(websocket, {
    options: { maxPayload: 8 * 1024 * 1024 },
  });

  app.get<{ Querystring: { token?: string; kind?: string } }>(
    "/yjs",
    { websocket: true },
    (socket, request) => {
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

            if (encoding.length(encoder) > 1) {
              connection.send(encoding.toUint8Array(encoder));
            }
          } else if (messageType === MESSAGE_AWARENESS) {
            applyAwarenessUpdate(shared.awareness, decoding.readVarUint8Array(decoder), connection);
          }
        } catch (error) {
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
          roomId = roomIdFromName(claims.video?.room);

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

        for (const raw of pending) {
          handleFrame(raw);
        }

        pending.length = 0;
      })();
    },
  );
}
