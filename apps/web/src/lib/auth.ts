import "server-only";

import { DEFAULT_LOCALE } from "@us-stream/shared";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { MongoClient } from "mongodb";
import { env } from "@/env";

const globalForAuth = globalThis as unknown as { usStreamAuthClient?: MongoClient };

const client =
  globalForAuth.usStreamAuthClient ??
  new MongoClient(env.MONGODB_URI, {
    maxPoolSize: 5,
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
  database: mongodbAdapter(client.db(), { client, transaction: false }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
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
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      requireLocalEmailVerified: false,
    },
  },
  user: {
    additionalFields: {
      locale: { type: "string", required: false, defaultValue: null },
      theme: { type: "string", required: false, defaultValue: "system" },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: env.BETTER_AUTH_URL.startsWith("https://"),
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type AuthUser = Session["user"];

export const DEFAULT_USER_LOCALE = DEFAULT_LOCALE;
