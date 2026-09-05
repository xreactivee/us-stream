import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Environment access for the web app. Anything read at runtime goes through
 * here so a missing or malformed variable fails the build instead of turning
 * into a confusing 500 in production.
 */
export const env = createEnv({
  server: {
    MONGODB_URI: z.string().min(1),

    LIVEKIT_API_KEY: z.string().min(1),
    LIVEKIT_API_SECRET: z.string().min(1),

    BETTER_AUTH_SECRET: z.string().min(16),
    BETTER_AUTH_URL: z.url(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    /** Signs the identity of people who join by link without an account. */
    GUEST_TOKEN_SECRET: z.string().min(16),

    /** Shared secret for calls into the realtime service on Railway. */
    REALTIME_INTERNAL_SECRET: z.string().min(16),
  },
  client: {
    /** The LiveKit signalling URL the browser connects to. */
    NEXT_PUBLIC_LIVEKIT_URL: z.string().min(1),
    /** The realtime service, used for Yjs document sync. */
    NEXT_PUBLIC_REALTIME_URL: z.string().min(1),
  },
  runtimeEnv: {
    MONGODB_URI: process.env.MONGODB_URI,
    LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GUEST_TOKEN_SECRET: process.env.GUEST_TOKEN_SECRET,
    REALTIME_INTERNAL_SECRET: process.env.REALTIME_INTERNAL_SECRET,
    NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    NEXT_PUBLIC_REALTIME_URL: process.env.NEXT_PUBLIC_REALTIME_URL,
  },
  emptyStringAsUndefined: true,
  /** Lets `next build` run in CI without production secrets present. */
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
});
