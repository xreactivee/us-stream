/**
 * Starts a build on both hosts without pushing anything.
 *
 *   pnpm deploy
 *
 * `git push` already deploys — both hosts watch the repository — so this is not
 * for shipping new commits. It is for the cases a push cannot cover: rebuilding
 * the commit that is already on the remote after changing an environment
 * variable, waking a service, or redeploying something that failed for a reason
 * that has since gone away.
 *
 * It never pushes. Firing a hook on top of a push would be two deploys of one
 * commit: the second supersedes the first, the host marks the first failed, and
 * it emails about a commit that deployed perfectly well.
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

/**
 * Commits sitting locally that the hosts cannot see.
 *
 * Worth saying out loud rather than blocking on: a hook builds whatever is on
 * the remote, so unpushed work is simply not in the build, and being told that
 * beats wondering why the change did not appear.
 */
function unpushedCount() {
  try {
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();

    const range = `origin/${branch}..HEAD`;
    const commits = execFileSync("git", ["rev-list", "--count", range], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    return { branch, ahead: Number(commits) };
  } catch {
    // No upstream, or no git at all. Neither stops a deploy.
    return { branch: null, ahead: 0 };
  }
}

const env = { ...readEnv(), ...process.env };

const hooks = [
  ["Vercel", env.VERCEL_DEPLOY_HOOK_URL],
  ["Render", env.RENDER_DEPLOY_HOOK_URL],
].filter(([, url]) => url);

if (hooks.length === 0) {
  console.error(
    "No deploy hooks configured. Put VERCEL_DEPLOY_HOOK_URL and/or\n" +
      "RENDER_DEPLOY_HOOK_URL in .env — see the top of this file for where each\n" +
      "one is created.",
  );
  process.exit(1);
}

const { branch, ahead } = unpushedCount();

if (ahead > 0) {
  console.warn(
    `Note: ${ahead} commit${ahead === 1 ? "" : "s"} on ${branch} ${
      ahead === 1 ? "is" : "are"
    } not pushed.\n` +
      "The hooks build what is on the remote, so those changes are not in this build.\n" +
      "Push them if you meant to ship them — the push deploys on its own.\n",
  );
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
