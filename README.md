# us-stream

Self-hosted video conferencing. Rooms you can return to, video and audio, screen sharing, chat, a
shared whiteboard, collaborative notes, breakout rooms and polls.

## Architecture

| Piece               | Runs on       | Responsibility                                                     |
| ------------------- | ------------- | ------------------------------------------------------------------ |
| `apps/web`          | Vercel        | The whole UI, plus auth, room CRUD and LiveKit token minting        |
| `apps/realtime`     | Railway       | Yjs sync, LiveKit webhooks, breakout timers — anything needing a persistent socket or a timer |
| LiveKit             | LiveKit Cloud | The SFU: audio, video, screen share, data channels, TURN            |
| Postgres            | Railway       | Rooms, meetings, chat history, polls, document snapshots            |
| Redis               | Railway       | Yjs pub/sub between realtime replicas (only from phase 5)           |
| `packages/shared`   | —             | Zod schemas, constants, the in-call data-channel protocol           |
| `packages/db`       | —             | Drizzle schema and the pool factory both runtimes use               |

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

If you have Docker, `docker compose up -d` starts Postgres, Redis and a development LiveKit server
matching the defaults in `.env.example`.

Without Docker, point `DATABASE_URL` at any hosted Postgres and `NEXT_PUBLIC_LIVEKIT_URL` /
`LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` at a LiveKit Cloud project. Redis is not needed before
phase 5.

```bash
pnpm db:generate   # write a migration from the Drizzle schema
pnpm db:migrate    # apply it
pnpm dev           # web on :3000, realtime on :3001
```

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
| `pnpm db:studio`  | Drizzle Studio against the configured database       |

## Conventions

- **TypeScript everywhere, strict.** `noUncheckedIndexedAccess` is on.
- **One definition per concept.** Roles and their permissions live in `packages/shared/src/roles.ts`;
  the in-call wire protocol lives in `packages/shared/src/events.ts` and is validated on both ends.
- **Enum-like columns are `text` with a TypeScript type**, not Postgres enums — the values are
  already constrained by Zod, and text columns do not need a migration to grow.
- **Biome** handles formatting, linting and import ordering. There is no ESLint or Prettier.
- The workspace packages ship TypeScript source rather than build output; Next transpiles them via
  `transpilePackages` and the realtime service bundles them with tsup.
