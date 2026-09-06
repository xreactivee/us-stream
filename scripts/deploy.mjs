/**
 * Pushes the current branch, which is what deploys it.
 *
 *   pnpm deploy
 *
 * Both hosts watch the repository and build on a push by themselves, so the
 * push is the whole job. This wraps it to refuse a dirty tree and to say what
 * happens next.
 *
 * **Do not fire the deploy hooks as well while auto-deploy is on.** A push and
 * a hook are two separate deploys of one commit: the second one supersedes the
 * first, the host marks the first failed or cancelled, and it emails to say so.
 * The site ends up correct and current while the inbox fills with failures for
 * commits that deployed perfectly well — which is a genuinely confusing thing
 * to debug, because nothing is actually broken.
 *
 * If auto-deploy is switched off on either host, ask for the hooks explicitly:
 *
 *   pnpm deploy --hooks
 *
 * A deploy hook is a URL that starts a build when something POSTs to it. Anyone
 * holding one can spend your build minutes, so they live in `.env` beside the
 * other secrets and never in the repository:
 *
 *   VERCEL_DEPLOY_HOOK_URL   Vercel  > Settings > Git > Deploy Hooks > Create
 *   RENDER_DEPLOY_HOOK_URL   Render  > the service > Settings > Deploy Hook
 *
 * Either may be left out; the ones that are set are the ones that fire.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function git(...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

/** Reads `.env` without pulling in a dependency for six lines of parsing. */
function readEnv() {
  const entries = {};

  try {
    for (const line of readFileSync(join(root, ".env"), "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }

      const separator = trimmed.indexOf("=");
      entries[trimmed.slice(0, separator).trim()] = trimmed
        .slice(separator + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  } catch {
    // No .env is fine: the hooks may come from the environment instead.
  }

  return entries;
}

const env = { ...readEnv(), ...process.env };
const branch = git("rev-parse", "--abbrev-ref", "HEAD");

// Deploying a tree that does not match the commit means shipping something
// nobody can reproduce from the repository.
const dirty = git("status", "--porcelain");

if (dirty) {
  console.error("Uncommitted changes. Commit or stash them first:\n");
  console.error(dirty);
  process.exit(1);
}

console.log(`Pushing ${branch}…`);
execFileSync("git", ["push", "origin", branch], { cwd: root, stdio: "inherit" });

// Off unless asked for. Firing a hook on top of the push the host is already
// reacting to means two deploys of one commit, and a failure email for the one
// that loses.
const useHooks = process.argv.slice(2).includes("--hooks");

const hooks = useHooks
  ? [
      ["Vercel", env.VERCEL_DEPLOY_HOOK_URL],
      ["Render", env.RENDER_DEPLOY_HOOK_URL],
    ].filter(([, url]) => url)
  : [];

if (!useHooks) {
  console.log(
    "\nPushed. Both hosts build this on their own from here.\n" +
      "If either has auto-deploy switched off, run `pnpm deploy --hooks` instead.",
  );
  process.exit(0);
}

if (hooks.length === 0) {
  console.error(
    "\n--hooks was asked for but neither VERCEL_DEPLOY_HOOK_URL nor\n" +
      "RENDER_DEPLOY_HOOK_URL is set in .env — see the top of this file.",
  );
  process.exit(1);
}

let failed = false;

for (const [name, url] of hooks) {
  const response = await fetch(url, { method: "POST" }).catch((error) => {
    console.error(`${name}: could not reach the hook — ${error.message}`);
    return null;
  });

  if (!response) {
    failed = true;
    continue;
  }

  if (!response.ok) {
    // A hook that 404s is usually one that was deleted or belongs to a project
    // that no longer exists, which is worth saying rather than retrying.
    console.error(`${name}: the hook answered ${response.status}`);
    failed = true;
    continue;
  }

  console.log(`${name}: build started`);
}

if (failed) {
  process.exit(1);
}

console.log(
  "\nBoth builds are queued. Watch them in each dashboard; a hook says only that\nthe build began, never that it succeeded.",
);
