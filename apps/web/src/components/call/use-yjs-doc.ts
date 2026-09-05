"use client";

import type { DocKind } from "@us-stream/shared";
import { useEffect, useState } from "react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

export interface YjsConnection {
  doc: Y.Doc;
  provider: WebsocketProvider;
  connected: boolean;
  /** True until the first sync completes, so nothing renders a blank board. */
  loading: boolean;
}

/**
 * Connects one collaborative document to the realtime service.
 *
 * The LiveKit access token is the credential. It already proves its holder was
 * admitted to this room, and the server derives the room from it, so a
 * whiteboard cannot be opened by anyone who could not join the call and there
 * is no second credential to keep in step with the first.
 */
export function useYjsDoc({
  kind,
  token,
  serverUrl,
  displayName,
}: {
  kind: DocKind;
  token: string;
  serverUrl: string;
  displayName: string;
}): YjsConnection | null {
  const [connection, setConnection] = useState<YjsConnection | null>(null);

  useEffect(() => {
    const doc = new Y.Doc();

    // y-websocket appends the room name to the URL, so "yjs" produces
    // `.../yjs?token=…&kind=…`, which is the route the service exposes. The
    // room itself is not in the path: it comes from the token, where a client
    // cannot change it.
    const provider = new WebsocketProvider(serverUrl, "yjs", doc, {
      params: { token, kind },
    });

    // Presence: a colour and a name for this person's cursor. Derived from the
    // display name so the same person keeps the same colour between sessions.
    provider.awareness.setLocalStateField("user", {
      name: displayName,
      color: colorFor(displayName),
    });

    const update = () =>
      setConnection((current) =>
        current
          ? { ...current, connected: provider.wsconnected, loading: !provider.synced }
          : current,
      );

    provider.on("status", update);
    provider.on("sync", update);

    setConnection({ doc, provider, connected: false, loading: true });

    return () => {
      provider.off("status", update);
      provider.off("sync", update);
      provider.destroy();
      doc.destroy();
      setConnection(null);
    };
  }, [kind, token, serverUrl, displayName]);

  return connection;
}

/** Stable pastel from a name, so cursors are distinguishable but never harsh. */
function colorFor(name: string): string {
  let hash = 0;

  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 360;
  }

  return `hsl(${hash} 70% 55%)`;
}
