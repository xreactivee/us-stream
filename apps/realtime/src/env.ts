import { config as loadDotenv } from "dotenv";
import { z } from "zod";

// Local development reads the single .env at the repository root. On a host
// the file is absent and the platform's own variables are used instead.
loadDotenv({ path: "../../.env", quiet: true });

/**
 * Validated once at boot. A missing variable should stop the process
 * immediately rather than surface as a confusing failure on first request.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default("0.0.0.0"),

  MONGODB_URI: z.string().min(1),

  /**
   * The same signalling URL the browser uses. The service needs it to reach
   * LiveKit's REST API, which lives on the same host.
   */
  LIVEKIT_URL: z.string().min(1),
  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(1),

  /** Shared secret for server-to-server calls from the Next.js app. */
  REALTIME_INTERNAL_SECRET: z.string().min(16),

  /** Origins allowed to open a WebSocket against this service. */
  ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
});

function loadEnv() {
  // Every host injects PORT and expects the process to use it; everything
  // else comes from the service's own variables.
  // LIVEKIT_URL falls back to the browser-facing name so a single .env serves
  // both apps in development.
  const parsed = envSchema.safeParse({
    ...process.env,
    PORT: process.env.PORT,
    LIVEKIT_URL: process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment for the realtime service:\n${issues}`);
  }

  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;
