import type { Types } from "@us-stream/db";
import type { DocKind } from "@us-stream/shared";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import type { env } from "./env";

export type Env = typeof env;

export interface DocConnection {
  send(data: Uint8Array): void;
  controlledIds: Set<number>;
}

export interface SharedDoc {
  key: string;
  roomId: Types.ObjectId;
  kind: DocKind;
  doc: Y.Doc;
  awareness: Awareness;
  connections: Set<DocConnection>;
  dirty: boolean;
  snapshotTimer: NodeJS.Timeout | null;
}
