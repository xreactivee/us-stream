# us-stream

Self-hosted video conferencing. Rooms you can return to, video and audio, screen sharing, chat, a
shared whiteboard, collaborative notes, a waiting room and polls.

## Architecture

| Piece               | Runs on       | Responsibility                                                     |
| ------------------- | ------------- | ------------------------------------------------------------------ |
| `apps/web`          | Vercel        | The whole UI, plus auth, room CRUD and LiveKit token minting        |
| `apps/realtime`     | Railway       | Yjs sync, LiveKit webhooks, meeting close-out — anything needing a persistent socket or a timer |
| LiveKit             | LiveKit Cloud | The SFU: audio, video, screen share, data channels, TURN            |
| MongoDB             | Atlas         | Rooms, meetings, chat history, polls, document snapshots            |
| Redis               | Railway       | Yjs pub/sub between realtime replicas (only from phase 5)           |
| `packages/shared`   | —             | Zod schemas, constants, roles, the in-call data-channel protocol    |
| `packages/db`       | —             | Mongoose models, the connection singleton, and the cascade helpers  |
| `packages/livekit`  | —             | Token minting and the role-to-grant mapping, used by both servers. Never imported from the browser |

There is no separate REST backend. Everything that can live in a Next.js route handler does; the
Fastify service exists only for the work Vercel functions cannot do.

### Why LiveKit Cloud rather than self-hosting on Railway

Railway does not accept inbound UDP, so a self-hosted SFU there has to force WebRTC over TCP. That
works, but TCP head-of-line blocking degrades audio and video noticeably under packet loss. LiveKit
Cloud's free tier gives real UDP plus TURN at no cost.

Nothing in the code depends on that choice. `NEXT_PUBLIC_LIVEKIT_URL`, `LIVEKIT_API_KEY` and
`LIVEKIT_API_SECRET` point wherever you like — a self-hosted server on a VPS, the local
`docker-compose.yml`, or LiveKit Cloud.

## Getting started

Requires Node 22 or newer and pnpm 11.

```bash
pnpm install
cp .env.example .env   # then fill it in
```

The repository keeps a **single `.env` at its root**. The web app loads it through
`@next/env` in `next.config.ts`, and the realtime service and migration tooling load it with
`dotenv`, so the three can never drift apart.

### Infrastructure

If you have Docker, `docker compose up -d` starts MongoDB, Redis and a development LiveKit server
matching the defaults in `.env.example`.

Without Docker, point `MONGODB_URI` at a MongoDB Atlas cluster and `NEXT_PUBLIC_LIVEKIT_URL` /
`LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` at a LiveKit Cloud project. Redis is not needed before
phase 5.

```bash
pnpm db:check     # confirm MONGODB_URI actually reaches a cluster
pnpm db:indexes   # push the schemas' indexes to it
pnpm dev          # web on :3000, realtime on :3001
```

MongoDB needs no migrations, but an index declared in a schema only reaches the server when
something asks for it. Run `pnpm db:indexes` after changing one; it also drops indexes that are no
longer declared, so the cluster ends up matching the schemas exactly.

## Scripts

| Command           | What it does                                        |
| ----------------- | --------------------------------------------------- |
| `pnpm dev`        | Runs both apps in watch mode                         |
| `pnpm build`      | Production build of both apps                        |
| `pnpm typecheck`  | `tsc --noEmit` across every workspace package        |
| `pnpm lint`       | Biome check                                          |
| `pnpm lint:fix`   | Biome check with fixes and import sorting applied    |
| `pnpm test`       | Vitest unit tests                                    |
| `pnpm test:e2e`   | Playwright, with fake camera and microphone devices  |
| `pnpm db:check`   | Verifies `MONGODB_URI` reaches a cluster and reports it |
| `pnpm db:indexes` | Synchronises every model's indexes with the cluster  |

## Conventions

- **TypeScript everywhere, strict.** `noUncheckedIndexedAccess` is on.
- **One definition per concept.** Roles and their permissions live in `packages/shared/src/roles.ts`;
  the in-call wire protocol lives in `packages/shared/src/events.ts` and is validated on both ends.
- **Bounded children are embedded, unbounded ones are not.** Room members, meeting participants,
  and poll votes live inside their parent document because they are always read
  with it and their number is capped by the room's capacity. Chat messages get their own collection.
- **MongoDB has no cascading deletes**, so every delete that spans documents goes through
  `packages/db/src/cascade.ts`. Nothing calls `deleteOne` on a room directly.
- **`sanitizeFilter` is on globally** (`packages/db/src/connect.ts`). It strips query operators out
  of filter values, so a request body containing `{"$ne": null}` cannot widen a query into one that
  matches every document. The cost is that Mongoose cannot tell your deliberate `$in` from an
  injected one, so **any operator you write in a filter value must be wrapped in `trusted()`**:

  ```ts
  await MessageModel.deleteMany({ meetingId: trusted({ $in: meetingIds }) });
  ```

  Without it the query throws a `CastError` at runtime rather than failing to compile, and only on
  the path where the operator is actually reached. Top-level operators (`$or`, `$and`) are filter
  *keys* rather than values and need no wrapping.
- **Biome** handles formatting, linting and import ordering. There is no ESLint or Prettier.
- The workspace packages ship TypeScript source rather than build output; Next transpiles them via
  `transpilePackages` and the realtime service bundles them with tsup.
