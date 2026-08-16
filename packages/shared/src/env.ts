import { config } from "dotenv";
import { resolve } from "path";

/**
 * Load .env from monorepo root.
 * Safe to call multiple times — dotenv skips already-set vars.
 */
export function loadEnv(): void {
  config({ path: resolve(process.cwd(), ".env") });
  // Also try two levels up (for running from packages/*/)
  config({ path: resolve(process.cwd(), "../../.env") });
}

/**
 * Assert required env vars exist, throw with actionable message if missing.
 */
export function requireEnv(...keys: string[]): Record<string, string> {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join("\n  ")}\n\nCopy .env.example to .env and fill in the values.`
    );
  }
  return Object.fromEntries(keys.map((k) => [k, process.env[k] as string]));
}
