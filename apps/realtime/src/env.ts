import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv({ path: "../../.env", quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default("0.0.0.0"),
  MONGODB_URI: z.string().min(1),
  LIVEKIT_URL: z.string().min(1),
  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(1),
  REALTIME_INTERNAL_SECRET: z.string().min(16),
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
