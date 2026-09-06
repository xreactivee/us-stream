/**
 * Turns the local `.env` into the two variable lists the hosts want.
 *
 * Both Vercel and Render can import a `.env` file rather than having twenty
 * values typed into a form, and typing them is where a deployment usually goes
 * wrong — one transposed character in a secret produces a failure that looks
 * like anything but a typo.
 *
 * The two lists are not the same. The web app needs the auth and Google
 * credentials the realtime service has no business holding, the realtime
 * service needs `LIVEKIT_URL` where the web app calls the same value
 * `NEXT_PUBLIC_LIVEKIT_URL`, and three values exist only once the deployment
 * does: the two public URLs and the origin allowed to open a socket.
 *
 * Output goes to `deploy-env/`, which is gitignored. It holds real secrets.
 *
 *   node scripts/deploy-env.mjs https://xrs-us-stream.vercel.app wss://us-stream.onrender.com
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const [webUrl, realtimeUrl] = process.argv.slice(2);

if (!webUrl || !realtimeUrl) {
  console.error(
    "usage: node scripts/deploy-env.mjs <https://web-url> <wss://realtime-url>\n" +
      "  the web URL is what the browser shows; the realtime URL is a WebSocket, so wss://",
  );
  process.exit(1);
}

if (!webUrl.startsWith("https://") || webUrl.endsWith("/")) {
  console.error("The web URL must start with https:// and must not end with a slash.");
  process.exit(1);
}

if (!realtimeUrl.startsWith("wss://") || realtimeUrl.endsWith("/")) {
  console.error("The realtime URL must start with wss:// and must not end with a slash.");
  process.exit(1);
}

/** Parses a `.env` well enough for values that may be quoted or contain `=`. */
function readEnv(path) {
  const entries = {};

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    entries[key] = value;
  }

  return entries;
}

const env = readEnv(join(root, ".env"));

const vercel = {
  MONGODB_URI: env.MONGODB_URI,
  NEXT_PUBLIC_LIVEKIT_URL: env.NEXT_PUBLIC_LIVEKIT_URL,
  LIVEKIT_API_KEY: env.LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET: env.LIVEKIT_API_SECRET,
  BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: webUrl,
  GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
  GUEST_TOKEN_SECRET: env.GUEST_TOKEN_SECRET,
  REALTIME_INTERNAL_SECRET: env.REALTIME_INTERNAL_SECRET,
  NEXT_PUBLIC_REALTIME_URL: realtimeUrl,
  NEXT_PUBLIC_CONTACT_EMAIL: env.NEXT_PUBLIC_CONTACT_EMAIL,
};

const render = {
  MONGODB_URI: env.MONGODB_URI,
  // The service reaches LiveKit's REST API on the same host the browser signals
  // to, so it is the same value under a name without the public prefix.
  LIVEKIT_URL: env.NEXT_PUBLIC_LIVEKIT_URL,
  LIVEKIT_API_KEY: env.LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET: env.LIVEKIT_API_SECRET,
  REALTIME_INTERNAL_SECRET: env.REALTIME_INTERNAL_SECRET,
  ALLOWED_ORIGINS: webUrl,
  NODE_ENV: "production",
  NODE_VERSION: "22",
};

const outDir = join(root, "deploy-env");
mkdirSync(outDir, { recursive: true });

let incomplete = false;

for (const [name, values, note] of [
  ["vercel.env", vercel, "Vercel > Settings > Environment Variables > Import .env"],
  ["render.env", render, "Render > the service > Environment > Add from .env"],
]) {
  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error(`${name}: missing from .env — ${missing.join(", ")}`);
    incomplete = true;
  }

  const body = Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  writeFileSync(join(outDir, name), `# ${note}\n${body}\n`, "utf8");
  console.log(`deploy-env/${name} — ${Object.keys(values).length} variables`);
}

if (incomplete) {
  process.exit(1);
}

console.log("\nThese files contain real secrets. deploy-env/ is gitignored; keep it that way.");
