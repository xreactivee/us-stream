/**
 * Pushes the current branch and asks both hosts to build it.
 *
 * Vercel and Render both watch the repository and deploy on their own, so this
 * is not usually needed. It exists for the cases where that is switched off, or
 * where you want one command that ends with both builds started rather than two
 * dashboards to open:
 *
 *   pnpm deploy
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

const hooks = [
  ["Vercel", env.VERCEL_DEPLOY_HOOK_URL],
  ["Render", env.RENDER_DEPLOY_HOOK_URL],
].filter(([, url]) => url);

if (hooks.length === 0) {
  console.log(
    "\nPushed. No deploy hooks configured, so both hosts will build this on their own\n" +
      "if their Git auto-deploy is on. To trigger them from here instead, put\n" +
      "VERCEL_DEPLOY_HOOK_URL and RENDER_DEPLOY_HOOK_URL in .env — see the top of\n" +
      "this file for where each one is created.",
  );
  process.exit(0);
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

console.log("\nBoth builds are queued. Watch them in each dashboard; a hook says only that\nthe build began, never that it succeeded.");
