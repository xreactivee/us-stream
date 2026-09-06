import "server-only";

import { DEFAULT_LOCALE } from "@us-stream/shared";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { MongoClient } from "mongodb";
import { env } from "@/env";

/**
 * Better Auth owns its own collections (`user`, `session`, `account`,
 * `verification`) and talks to them through the MongoDB driver rather than
 * Mongoose, so it gets its own client.
 *
 * The pool is capped deliberately. The driver's default is 100 connections,
 * which a handful of warm serverless instances would multiply straight past a
 * free Atlas cluster's ceiling.
 */
const globalForAuth = globalThis as unknown as { usStreamAuthClient?: MongoClient };

const client =
  globalForAuth.usStreamAuthClient ??
  new MongoClient(env.MONGODB_URI, {
    maxPoolSize: 5,
    // A pool left idle overnight gets its sockets dropped somewhere in the
    // middle; without these the first request afterwards fails outright
    // instead of reconnecting.
    serverSelectionTimeoutMS: 10_000,
    retryReads: true,
    retryWrites: true,
  });
globalForAuth.usStreamAuthClient = client;

const googleConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  appName: "us-stream",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  // Transactions are off deliberately. Passing a client turns them on by
  // default, and the adapter at 1.7.2 then throws
  // "Cannot call abortTransaction after calling commitTransaction" on sign-up.
  // Better Auth's writes here are small and idempotent enough to live without
  // them; this is also the only configuration that works against a standalone
  // mongod, which has no transaction support at all.
  database: mongodbAdapter(client.db(), { client, transaction: false }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // No email provider is wired up yet, so requiring verification would lock
    // everyone out. Turn this on together with the mailer.
    requireEmailVerification: false,
  },

  socialProviders: googleConfigured
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID as string,
          clientSecret: env.GOOGLE_CLIENT_SECRET as string,
        },
      }
    : {},

  account: {
    /**
     * Signing in with Google using an address that already has a password
     * account attaches the two rather than refusing.
     *
     * Better Auth's default refuses, because linking a verified provider
     * identity to a local account we never verified lets whoever registered
     * the password first inherit the account of whoever owns the address. We
     * do not verify addresses yet — there is no mailer — so that guard is the
     * one thing standing between the two accounts.
     *
     * It is turned off deliberately: without it the only route back into an
     * account created with a password is that same password, and somebody who
     * signs up with Google out of habit is simply told "account not linked",
     * which is not a thing they can act on. When the mailer lands, turn
     * `requireEmailVerification` on above and delete
     * `requireLocalEmailVerified` here — the guard then costs nothing.
     */
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      requireLocalEmailVerified: false,
    },
  },

  user: {
    additionalFields: {
      /**
       * `null` on locale means "follow the country I am browsing from".
       *
       * Both are writable through the update endpoint because the settings
       * page persists them there. The values are validated against
       * `updatePreferencesSchema` before the call, so nothing arbitrary is
       * stored even though Better Auth types them as plain strings.
       */
      locale: { type: "string", required: false, defaultValue: null },
      theme: { type: "string", required: false, defaultValue: "system" },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    // Serves the session from a signed cookie for a few minutes so that every
    // page render does not cost a database round trip.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: env.BETTER_AUTH_URL.startsWith("https://"),
    },
  },

  // Must stay last: it lets server actions set cookies returned by Better Auth.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type AuthUser = Session["user"];

export const DEFAULT_USER_LOCALE = DEFAULT_LOCALE;
