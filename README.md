# us-stream

us-stream — self-hosted video conferencing for teams.

## Features
- Rooms you can return to, video, and audio
- Screen sharing, chat, shared whiteboard, and collaborative notes
- Waiting room and interactive polls

## Architecture
- `apps/web`: Vercel (UI, auth, room CRUD, LiveKit token minting)
- `apps/realtime`: Render (Yjs sync, LiveKit webhooks, meeting close-out)
- LiveKit Cloud: SFU for audio, video, screen share, data channels, and TURN
- MongoDB Atlas: Data storage for rooms, meetings, chat history, polls, and document snapshots
- `packages/shared`: Zod schemas, constants, roles, and in-call data-channel protocol
- `packages/db`: Mongoose models, connection singleton, and cascade helpers
- `packages/livekit`: Token minting and role-to-grant mapping

## Tech Stack
- TypeScript
- Next.js
- MongoDB
- LiveKit
- Tailwind CSS
- Biome

## Installation
```bash
git clone https://github.com/xreactivee/us-stream.git
cd us-stream
pnpm install
cp .env.example .env
```

## Usage
```bash
pnpm db:check     # confirm MONGODB_URI actually reaches a cluster
pnpm db:indexes   # push the schemas' indexes to it
pnpm dev          # web on :3001, realtime on :3001
```

## License
MIT