# Troubleshooting

Real issues encountered while building/testing this repo, and their fixes — not hypothetical
scenarios. Check `/status` and `/api/health` first; they usually tell you exactly which
subsystem is unconfigured.

## Setup / local dev

### `npm install` or `npm run dev` fails with a missing native binary

Some native optional dependencies (e.g. Tailwind v4's `lightningcss`) aren't always installed
correctly by npm on every platform. Fix:

```bash
chmod +x node_modules/.bin/*
npm install --no-save lightningcss-linux-x64-gnu   # adjust for your platform if not linux-x64
```

### `npm run test` fails with `Cannot find native binding` (rolldown)

Vitest's bundler (`vite` → `rolldown`) can hit the same class of npm optional-dependency
resolution bug (see [npm/cli#4828](https://github.com/npm/cli/issues/4828)). Fix:

```bash
npm install @rolldown/binding-linux-x64-gnu --no-save   # adjust for your platform
```

### `npm run test` fails with `ERR_REQUIRE_ESM` loading the Vitest config

This project's `package.json` has no `"type": "module"`, so a `.ts` config file may get
loaded as CommonJS and fail requiring an ESM-only dependency. Fix: the config is named
`vitest.config.mts` (not `.ts`) specifically to force Node to load it as ESM regardless of
the package's default module type — if you rename it, keep the `.mts` extension.

### OAuth sign-in redirects to `/auth/auth-code-error`

- Confirm the Google/GitHub OAuth app's redirect URI is exactly
  `https://<project-ref>.supabase.co/auth/v1/callback` (not your app's own domain).
- Confirm both providers are enabled under Supabase **Authentication → Providers**.
- Confirm your app's URL (`http://localhost:3000` locally) is in Supabase's
  **Authentication → URL Configuration → Redirect URLs** allow-list.

### Login works but every page redirects back to `/login`

The session cookie isn't being refreshed. Check that `src/proxy.ts`'s `matcher` config still
covers the route you're hitting, and that `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`
are correct (a wrong anon key causes silent auth failures, not an explicit error).

## Model configuration / agent loop

### "Add a model API key in Settings before starting a research session"

You have a model config saved, but none is marked `is_default` (or the loop couldn't decrypt
it). Go to Settings and click a config's "Set as default", or re-add the key if
`ENCRYPTION_KEY` was changed after the key was saved (see below).

### A previously-saved model API key suddenly fails to decrypt / "Test Connection" errors

`ENCRYPTION_KEY` was changed after the key was encrypted. This is expected and by design —
the encryption key is derived directly from `ENCRYPTION_KEY`; changing it makes all
previously-encrypted keys permanently undecryptable. Re-add the model config with the current
`ENCRYPTION_KEY`. **Never change `ENCRYPTION_KEY` in a running production environment** without
a migration plan for existing users' keys.

### Research fails immediately with "Brave Search is not configured on the server"

`BRAVE_SEARCH_API_KEY` is missing or a placeholder value. Set a real key (see
[ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)) — the agent loop itself still runs
without it, but the `web_search` tool call will always fail.

### A model provider rejects the request mentioning "tools" or "function calling"

Some OpenAI-compatible providers don't support tool calling. The agent loop detects this
(`toolsSupported` flag in `src/lib/agent/loop.ts`) and automatically retries without tools —
if you still see a hard failure, the provider likely rejected the request for an unrelated
reason (check the humanized error message, which maps 401/429/timeout/network distinctly).

## Credits / billing

### "You're out of credits" immediately after paying

Most likely cause in this repo's history: the credit-ledger migration
(`supabase/migrations/0002_security_and_credits.sql`, which defines `decrement_credit`,
`refund_credit`, `redeem_coupon`, and `grant_payment_credits`) hasn't been applied to your
database. Without it, the RPC calls these routes make will fail. Run it via the Supabase SQL
editor. This has been the single most frequently re-flagged blocker across this project's
audit history — always check this first for any credit/coupon/payment issue.

### Coupon code rejected even though it looks correct

The valid code is compared case-insensitively against `COUPON_CODE` in
[src/lib/stripe.ts](../src/lib/stripe.ts) (currently `SID_DRDROID`) — check for extra
whitespace, and confirm `0002_security_and_credits.sql` has been applied (the `redeem_coupon`
RPC itself must exist).

### Adding a Google/xAI/OpenRouter/Groq model config fails at the database layer

`supabase/migrations/0003_model_providers.sql` (which widens the `model_configs.provider`
check constraint beyond `openai`/`anthropic`/`kimi`/`custom`) hasn't been applied.

### Share Research button fails / shared link 404s

`supabase/migrations/0004_report_sharing.sql` (adds `reports.share_token`) hasn't been
applied.

## Deployment

### OAuth works locally but breaks in production

`NEXT_PUBLIC_SITE_URL` isn't set (or still points at `localhost`) in your production
environment variables. Check `/status` — `checkOAuthRedirectConfig()` will show this as
`degraded`.

### `/api/chat` times out on long research sessions in production

Vercel's Hobby plan caps function duration at 60s; this route sets `maxDuration = 120`. Either
upgrade to Pro/Fluid Compute, or lower `maxDuration` in
[src/app/api/chat/route.ts](../src/app/api/chat/route.ts) to 60 and accept shorter research
sessions.

### Stripe webhook returns 400 / credits aren't granted automatically

- Confirm `STRIPE_WEBHOOK_SECRET` matches the endpoint you configured in the Stripe Dashboard
  (each endpoint has its own signing secret).
- The `/api/billing/confirm` fallback (triggered on redirect back from Checkout) will still
  grant credits even if the webhook is misconfigured — if credits are missing after *that*
  redirect too, check that `0002_security_and_credits.sql` is applied.

### `/status` shows a check as `unavailable` or `degraded`

Every check corresponds 1:1 to an environment variable or live connection — see
[src/lib/health.ts](../src/lib/health.ts) and [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
for exactly which variable each check depends on.

## Still stuck?

Check the per-prompt reports in `docs/reports/` — many document exact issues encountered
and how they were resolved during development, including this exact codebase's history of
env/tooling quirks.
