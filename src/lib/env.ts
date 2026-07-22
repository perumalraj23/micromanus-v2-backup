/**
 * Environment variable validation.
 *
 * Missing variables never crash the app at import time (serverless startup must stay fast
 * and resilient) — instead callers use `getEnvStatus()` to build health/deployment checks,
 * and individual libs (stripe.ts, crypto.ts, brave-search.ts) fail fast with a friendly error
 * only when that specific feature is actually used.
 */
export type EnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "ENCRYPTION_KEY"
  | "STRIPE_SECRET_KEY"
  | "STRIPE_WEBHOOK_SECRET"
  | "BRAVE_SEARCH_API_KEY"
  | "NEXT_PUBLIC_SITE_URL";

const REQUIRED: EnvKey[] = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ENCRYPTION_KEY",
];

const OPTIONAL: EnvKey[] = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "BRAVE_SEARCH_API_KEY",
  "NEXT_PUBLIC_SITE_URL",
];

function isPlaceholder(value: string): boolean {
  return /placeholder|your-|xxx|changeme/i.test(value);
}

export type EnvVarStatus = { key: EnvKey; present: boolean; looksPlaceholder: boolean };

export function getEnvStatus(): { required: EnvVarStatus[]; optional: EnvVarStatus[]; missingRequired: EnvKey[] } {
  const check = (key: EnvKey): EnvVarStatus => {
    const value = process.env[key];
    return { key, present: Boolean(value), looksPlaceholder: Boolean(value && isPlaceholder(value)) };
  };

  const required = REQUIRED.map(check);
  const optional = OPTIONAL.map(check);
  const missingRequired = required.filter((r) => !r.present).map((r) => r.key);

  return { required, optional, missingRequired };
}
