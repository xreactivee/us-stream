"use client";

import type { DocKind } from "@us-stream/shared";
import { useEffect, useState } from "react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

export interface YjsConnection {
  doc: Y.Doc;
  provider: WebsocketProvider;
  connected: boolean;

  loading: boolean;
}

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

    const provider = new WebsocketProvider(serverUrl, "yjs", doc, {
      params: { token, kind },
    });

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

export function colorFor(name: string): string {
  let hash = 0;

  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 360;
  }

  return hslToHex(hash, 0.7, 0.55);
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const amplitude = saturation * Math.min(lightness, 1 - lightness);

  const channel = (offset: number) => {
    const k = (offset + hue / 30) % 12;

    return Math.round((lightness - amplitude * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255)
      .toString(16)
      .padStart(2, "0");
  };

  return `#${channel(0)}${channel(8)}${channel(4)}`;
}
