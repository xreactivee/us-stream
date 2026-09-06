# Deploying us-stream

Two things get deployed, from one repository:

| What                        | Where     | Why there                                                            |
| --------------------------- | --------- | -------------------------------------------------------------------- |
| `apps/web` — the Next.js app | Vercel    | The whole interface, auth, room management, LiveKit token minting     |
| `apps/realtime` — Fastify    | Railway   | The whiteboard/notes WebSocket, LiveKit webhooks, closing meetings     |

Nothing else is deployed. `packages/*` are TypeScript source that both apps
compile into themselves, and there is no separate database server to run —
MongoDB is Atlas and the media server is LiveKit Cloud, both already set up.

Do the whole thing in this order. Steps 3 and 4 refer to each other's URLs, so
you will come back and edit a variable once; that is expected, not a mistake.

---

## 1. Push the repository to GitHub

Both platforms deploy from a Git repository, so the code has to be somewhere
they can read it.

```bash
git remote -v
```

If that prints nothing, create an empty repository on GitHub and:

```bash
git remote add origin https://github.com/<user>/us-stream.git
git push -u origin master
```

**`.env` is in `.gitignore` and must stay out of the repository.** The database
password, the Google client secret and the LiveKit API secret are in it. Every
secret is entered by hand into Vercel and Railway instead.

---

## 2. Collect the values you will paste

Have these open before you start. They are the same values already in your local
`.env`, except the three URLs, which do not exist yet.

| Variable                    | Where it comes from                                     |
| --------------------------- | ------------------------------------------------------- |
| `MONGODB_URI`               | Atlas, unchanged                                        |
| `NEXT_PUBLIC_LIVEKIT_URL`   | LiveKit Cloud, `wss://…livekit.cloud`, unchanged        |
| `LIVEKIT_API_KEY`           | LiveKit Cloud, unchanged                                |
| `LIVEKIT_API_SECRET`        | LiveKit Cloud, unchanged                                |
| `BETTER_AUTH_SECRET`        | unchanged                                               |
| `GUEST_TOKEN_SECRET`        | unchanged                                               |
| `REALTIME_INTERNAL_SECRET`  | unchanged — must be **identical** on both platforms     |
| `GOOGLE_CLIENT_ID`          | Google Cloud, unchanged                                 |
| `GOOGLE_CLIENT_SECRET`      | Google Cloud, unchanged                                 |
| `NEXT_PUBLIC_CONTACT_EMAIL` | an address you are willing to publish (see step 7)      |
| `BETTER_AUTH_URL`           | the Vercel URL — step 3                                 |
| `NEXT_PUBLIC_REALTIME_URL`  | the Railway URL — step 4                                |
| `ALLOWED_ORIGINS`           | the Vercel URL — step 4                                 |

Atlas also needs to accept connections from both platforms. Neither has fixed
outbound addresses, so under **Network Access** add `0.0.0.0/0`. That is not as
open as it looks: the connection still needs the username and password in the
URI. Restricting it further requires a paid VPC peering plan.

---

## 3. Vercel — the web app

**New Project → import the repository.** Then, before deploying:

- **Root Directory:** `apps/web`
- Leave **Include files outside the root directory** on. It is what lets the
  build see `packages/*` and the pnpm lockfile; without it the install fails on
  the `workspace:*` dependencies.
- **Framework preset:** Next.js — detected automatically
- **Build / Install / Output:** leave all three empty. The defaults run
  `pnpm install` at the repository root and `pnpm build` in `apps/web`, which is
  correct. The build script wraps the command in `dotenv-cli`, which simply
  finds no `.env` on Vercel and carries on with the platform's own variables.

Add every variable from step 2 **except** `NEXT_PUBLIC_REALTIME_URL` and
`ALLOWED_ORIGINS` (that one is the realtime service's, not the web app's). For
`BETTER_AUTH_URL` put what the deployment's address will be —
`https://us-stream.vercel.app`, or your own domain if you attach one. It must
have no trailing slash and it must be `https://`; the auth cookie is marked
`secure` based on that prefix.

Deploy. It will fail to load the whiteboard and the notes, because
`NEXT_PUBLIC_REALTIME_URL` is not set yet. Everything else — signing in, opening
a room, video, audio, screen sharing, chat — already works. Note the URL.

---

## 4. Railway — the realtime service

**New Project → Deploy from GitHub repo → this repository.**

Railway will try to guess how to build it and guess wrong, because the root of
the repository is a workspace rather than an app. Under the service's
**Settings**:

- **Root Directory:** leave it as the repository root, `/`. It has to be the
  root — the service depends on `@us-stream/*`, which only exist there.
- **Build Command:** `pnpm install --frozen-lockfile && pnpm --filter realtime build`
- **Start Command:** `pnpm --filter realtime start`

Variables:

| Variable                   | Value                                                     |
| -------------------------- | --------------------------------------------------------- |
| `MONGODB_URI`              | the same Atlas string                                     |
| `LIVEKIT_URL`              | the same `wss://…livekit.cloud`                           |
| `LIVEKIT_API_KEY`          | the same key                                              |
| `LIVEKIT_API_SECRET`       | the same secret                                           |
| `REALTIME_INTERNAL_SECRET` | **exactly** what you put on Vercel                        |
| `ALLOWED_ORIGINS`          | your Vercel URL, e.g. `https://us-stream.vercel.app`      |
| `NODE_ENV`                 | `production`                                              |

Do **not** set `PORT`. Railway injects it, and the service reads it from there.

Under **Settings → Networking**, press **Generate Domain**. You get something
like `us-stream-realtime-production.up.railway.app`.

Check it is alive:

```bash
curl https://<your-railway-domain>/health
```

`{"status":"ok",...}` means the service is up and reached MongoDB.

---

## 5. Point the two at each other

Back on Vercel, add:

```
NEXT_PUBLIC_REALTIME_URL=wss://<your-railway-domain>
```

**`wss://`, not `https://`.** It is the address of a WebSocket, and the browser
will refuse an insecure or mistyped scheme without a useful message.

Redeploy on Vercel (Deployments → the latest one → Redeploy). A `NEXT_PUBLIC_`
variable is baked into the browser bundle at build time, so setting it is not
enough on its own — the app has to be built again.

If you later attach a custom domain, `ALLOWED_ORIGINS` on Railway takes both,
comma-separated and without spaces:

```
https://us-stream.vercel.app,https://us-stream.com
```

---

## 6. LiveKit webhook (optional but worth doing)

In the LiveKit Cloud console, **Settings → Webhooks**, add:

```
https://<your-railway-domain>/livekit/webhook
```

Meetings close without this — the service asks LiveKit which rooms are still
alive every fifteen seconds and closes the rest — but the webhook does it within
a second or two, and the meeting history reads better for it.

---

## 7. Google sign-in

In Google Cloud Console → **APIs & Services → Credentials → your OAuth client**,
add to **Authorised redirect URIs**:

```
https://<your-vercel-domain>/api/auth/callback/google
```

and to **Authorised JavaScript origins**:

```
https://<your-vercel-domain>
```

On the **OAuth consent screen**, the home page, privacy policy and terms fields
want public URLs, which now exist:

- Home: `https://<your-vercel-domain>`
- Privacy: `https://<your-vercel-domain>/privacy`
- Terms: `https://<your-vercel-domain>/terms`

Those two pages print `NEXT_PUBLIC_CONTACT_EMAIL`, and Google's reviewers read
them. Use an address you are content to have on a public page — a forwarding
alias is fine; your personal inbox is a decision you cannot take back once it is
indexed.

---

## 8. Database indexes

Once, from your own machine, against the production database:

```bash
pnpm db:indexes
```

Mongoose creates indexes on demand in development, but a deployed app should not
be building indexes while it serves requests. Run this again whenever a schema
gains an index.

---

## What each platform costs

- **Vercel Hobby** — free, and this app fits: no cron, no long-running
  functions, no image optimisation of note.
- **Railway** — the trial credit runs out; after that the service is a few
  dollars a month. It is one small always-on Node process.
- **MongoDB Atlas M0** — free, 512 MB. Chat and whiteboard snapshots are small.
- **LiveKit Cloud** — the free tier covers small meetings. Media minutes are
  what it counts, and they are what a growing meeting spends.

## When something is wrong

**The whiteboard says it is connecting, forever.** `NEXT_PUBLIC_REALTIME_URL` is
wrong, or you did not redeploy Vercel after setting it. Open the browser console:
a failed WebSocket names the address it tried, which is usually the whole answer.

**Signing in bounces back to the sign-in page.** `BETTER_AUTH_URL` does not match
the address in the browser's bar. A trailing slash counts as not matching.

**"Failed to connect" the moment a call starts.** LiveKit's key and secret on
Vercel do not belong to the project `NEXT_PUBLIC_LIVEKIT_URL` names.

**Everything works locally and nothing works deployed.** Compare Vercel's
variable list against step 2 line by line. It is almost always one that was
never pasted.

**The realtime service restarts in a loop.** Its logs print exactly which
variable failed validation; it refuses to boot half-configured rather than fail
later on somebody's first request.

## One deliberate limitation

**Run exactly one Railway replica.** The whiteboard and the notes are held in
that process's memory. A second replica would keep its own copy of the same
board, and two people could end up drawing on documents that never meet.
Scaling past one replica needs Redis pub/sub between them, which is a change to
`apps/realtime/src/yjs/registry.ts`, not a setting.
