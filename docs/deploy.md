# Deploying us-stream

Two things get deployed, from one repository:

| What                         | Where              | Why there                                                        |
| ---------------------------- | ------------------ | ---------------------------------------------------------------- |
| `apps/web` — the Next.js app | Vercel             | The whole interface, auth, room management, LiveKit token minting |
| `apps/realtime` — Fastify    | Render (or Railway) | The whiteboard/notes WebSocket, LiveKit webhooks, closing meetings |

**The realtime service cannot go on Vercel**, and this is not a configuration
problem to work around. It holds a WebSocket open for as long as somebody has
the whiteboard on screen, and it runs a timer every fifteen seconds to close
meetings whose LiveKit room has gone. A Vercel function exists for the length of
one request. Any host that runs a normal long-lived Node process will do —
Render, Railway, Fly.io, Koyeb, a VPS — and the settings below are the same
shape on all of them.

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
secret is entered by hand into Vercel and the realtime host instead.

---

## 2. Collect the values you will paste

Have these open before you start. They are the same values already in your local
`.env`, except the two URLs, which do not exist yet.

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
| `NEXT_PUBLIC_REALTIME_URL`  | the realtime service's URL — step 4                     |
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

## 4. Render — the realtime service

The repository carries a `render.yaml` blueprint, so this is mostly confirming
what it already says.

**New → Blueprint → connect this repository.** Render reads `render.yaml`,
proposes one web service called `us-stream-realtime`, and asks for the six
values marked `sync: false`. Fill them in:

| Variable                   | Value                                                    |
| -------------------------- | -------------------------------------------------------- |
| `MONGODB_URI`              | the same Atlas string                                    |
| `LIVEKIT_URL`              | the same `wss://…livekit.cloud`                          |
| `LIVEKIT_API_KEY`          | the same key                                             |
| `LIVEKIT_API_SECRET`       | the same secret                                          |
| `REALTIME_INTERNAL_SECRET` | **exactly** what you put on Vercel                       |
| `ALLOWED_ORIGINS`          | your Vercel URL, e.g. `https://us-stream.vercel.app`     |

Do **not** add `PORT`. Render injects it and the service reads it from there.

If you would rather click through the form than use the blueprint, it is **New →
Web Service**, and the three settings that are not defaults:

- **Root Directory:** leave it empty — the repository root. It has to be the
  root, because the service depends on `@us-stream/*` and those only exist there.
- **Build Command:** `corepack enable && pnpm install --frozen-lockfile && pnpm --filter realtime build`
- **Start Command:** `node apps/realtime/dist/server.js`

The start command calls Node directly rather than `pnpm --filter realtime start`.
It runs in a fresh container, so going through pnpm makes corepack download and
unpack itself first — twelve seconds on every start, and a network dependency at
the moment the service is trying to come up.

Check it is alive once it deploys:

```bash
curl https://us-stream-realtime.onrender.com/health
```

`{"status":"ok",...}` means the service is up and reached MongoDB.

### If the Blueprint sync fails

The email Render sends says only that it failed. The actual message is on the
Blueprint's own page in the dashboard, and it is usually one of two things: a
field that cannot be changed after the service exists (`region` and `plan` are
both fixed at creation), or a service that failed its first deploy.

Nothing depends on the blueprint. Creating the service by hand with the three
settings above reaches exactly the same place, and is the faster route when you
are in a hurry — delete the blueprint, keep the service.

### What the free plan costs you

A free Render web service **sleeps after about fifteen minutes without traffic**,
and that has two visible effects here:

- The first person to open the whiteboard or the notes after a quiet spell waits
  the better part of a minute while the service wakes. The call itself is
  unaffected — video and audio go through LiveKit, not through this.
- The meeting-close timer does not run while the service sleeps, so a meeting can
  sit open in `/history` until something wakes the service again. It corrects
  itself; it is just late.

Two ways out. Pay for the smallest paid instance, which does not sleep. Or point
a free uptime monitor at `/health` every ten minutes — one always-on service fits
inside the free monthly instance hours, so this is within the plan rather than
around it.

## 4b. Railway, if you prefer it

Railway works and the shape is identical; use it if your account will let you.

Under the service's **Settings**:

- **Root Directory:** the repository root, `/`
- **Build Command:** `pnpm install --frozen-lockfile && pnpm --filter realtime build`
- **Start Command:** `pnpm --filter realtime start`

The same variables as above, plus `NODE_ENV=production`. Do not set `PORT`.
Under **Settings → Networking**, press **Generate Domain**.

Railway does not sleep, so the two caveats above do not apply — but its free
trial credit runs out, after which the service is a few dollars a month.

## 5. Point the two at each other

Back on Vercel, add:

```
NEXT_PUBLIC_REALTIME_URL=wss://<your-realtime-domain>
```

**`wss://`, not `https://`.** It is the address of a WebSocket, and the browser
will refuse an insecure or mistyped scheme without a useful message.

Redeploy on Vercel (Deployments → the latest one → Redeploy). A `NEXT_PUBLIC_`
variable is baked into the browser bundle at build time, so setting it is not
enough on its own — the app has to be built again.

If you later attach a custom domain, `ALLOWED_ORIGINS` on the realtime service takes both,
comma-separated and without spaces:

```
https://us-stream.vercel.app,https://us-stream.com
```

---

## 6. LiveKit webhook (optional but worth doing)

In the LiveKit Cloud console, **Settings → Webhooks**, add:

```
https://<your-realtime-domain>/livekit/webhook
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
- **Render free** — free, with the sleeping caveat in step 4. The smallest
  paid instance removes it for a few dollars a month.
- **Railway** — no sleeping, but the trial credit runs out and then it is a few
  dollars a month. One small always-on Node process either way.
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

**`Dynamic require of "fs" is not supported`, on the first line of `dist/server.js`.**
Something that calls `require()` at runtime has been bundled into an ESM output —
the MongoDB driver does this, and it is why `mongoose` and `mongodb` are in
`external` in `apps/realtime/tsup.config.ts` and `mongoose` is a declared
dependency of that package. If you add another dependency that loads Node
built-ins dynamically, it belongs in that list too. Run `node dist/server.js`
locally after building; `pnpm dev` runs the TypeScript through `tsx` and never
touches the bundle, so this class of failure only appears once it is deployed.

**The whiteboard takes forty seconds to connect, then behaves normally.** That is
a free Render instance waking up, not a bug. See step 4.

## One deliberate limitation

**Run exactly one replica of the realtime service.** The whiteboard and the notes are held in
that process's memory. A second replica would keep its own copy of the same
board, and two people could end up drawing on documents that never meet.
Scaling past one replica needs Redis pub/sub between them, which is a change to
`apps/realtime/src/yjs/registry.ts`, not a setting.
