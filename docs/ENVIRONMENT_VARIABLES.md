# Environment Variables

All variables are read via `process.env` directly in the modules listed below; validation
status for each is computed centrally in [src/lib/env.ts](../src/lib/env.ts) and surfaced at
`/api/health` and `/status`.

Copy `.env.example` to `.env.local` and fill in every value before running locally.

## Required (app fails health checks / core features break without these)

| Variable | Description | Where to get it | Used in |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. Exposed to the browser (prefixed `NEXT_PUBLIC_`) because the client-side Supabase SDK needs it. | Supabase → Project Settings → API | [src/lib/supabase/client.ts](../src/lib/supabase/client.ts), [server.ts](../src/lib/supabase/server.ts), [middleware.ts](../src/lib/supabase/middleware.ts) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key. Safe to expose — access is enforced by Row Level Security, not by keeping this secret. | Supabase → Project Settings → API | same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key. **Server-only, never prefix with `NEXT_PUBLIC_`.** Bypasses Row Level Security entirely — used only in Route Handlers, always additionally filtered by `user_id`. | Supabase → Project Settings → API | [src/lib/supabase/admin.ts](../src/lib/supabase/admin.ts) |
| `ENCRYPTION_KEY` | Any long random string. Derived via SHA-256 into a 32-byte AES-256-GCM key used to encrypt every user's model API key at rest. Rotating this value makes all previously-stored encrypted keys undecryptable — do not change it after users have added model configs. | Generate yourself, e.g. `openssl rand -base64 32` | [src/lib/crypto.ts](../src/lib/crypto.ts) |

## Optional (individual features degrade gracefully if missing — checked by `/status`)

| Variable | Description | Where to get it | Used in |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key (test mode: `sk_test_...`). Without it, `getStripe()` throws when checkout is attempted — the coupon-only paywall path still works. | Stripe Dashboard → Developers → API keys (Test mode) | [src/lib/stripe.ts](../src/lib/stripe.ts) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the `/api/billing/webhook` endpoint. Without it, the webhook route returns 400 for all events, but `/api/billing/confirm` (checked when the user is redirected back from Checkout) still grants credits — reported as "degraded" rather than "unavailable" by health checks. | Stripe Dashboard → Developers → Webhooks → your endpoint | [src/app/api/billing/webhook/route.ts](../src/app/api/billing/webhook/route.ts) |
| `BRAVE_SEARCH_API_KEY` | Brave Search API key. Without it, the agent's `web_search` tool throws immediately with a descriptive error — the agent loop still runs but can't search the web. | [Brave Search API dashboard](https://api.search.brave.com/app/keys) (free tier: 2,000 queries/month) | [src/lib/agent/brave-search.ts](../src/lib/agent/brave-search.ts) |
| `NEXT_PUBLIC_SITE_URL` | Public site URL, e.g. `http://localhost:3000` locally or `https://your-app.vercel.app` in production. Used for Stripe Checkout redirect URLs. If missing in production, OAuth-adjacent redirect construction silently falls back to `localhost`, which will break login for real users — flagged as `degraded` by `checkOAuthRedirectConfig()`. | Your own deployment URL | [src/app/api/billing/checkout/route.ts](../src/app/api/billing/checkout/route.ts), [src/lib/health.ts](../src/lib/health.ts) |

## Note on the prompt's requested variable names

The task list for this prompt referenced generic names (`SUPABASE_URL`, `OPENAI_API_KEY`,
`BRAVE_API_KEY`). This codebase's actual variable names (verified directly against
[src/lib/env.ts](../src/lib/env.ts) and [.env.example](../.env.example)) are
`NEXT_PUBLIC_SUPABASE_URL`, `BRAVE_SEARCH_API_KEY`, and there is **no `OPENAI_API_KEY` env
var at all** — model API keys are user-supplied at runtime through the Settings UI, encrypted
with `ENCRYPTION_KEY`, and stored per-user in `model_configs.api_key_encrypted` rather than as
a single server-wide environment variable. This table documents the real variable names to
avoid an engineer setting an env var that the app never reads.

## Per-user model API keys (not environment variables)

Each user supplies and stores their own model provider API key (OpenAI, Anthropic, Kimi,
Google, xAI, OpenRouter, Groq, or a custom endpoint) via the Settings page. These are never
environment variables — they're encrypted with `ENCRYPTION_KEY` and stored in the
`model_configs` table, scoped to that user by Row Level Security. See
[src/lib/pricing.ts](../src/lib/pricing.ts) for the built-in provider presets.
