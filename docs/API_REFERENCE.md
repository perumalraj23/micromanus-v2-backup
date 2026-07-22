# API Reference

All routes are Next.js Route Handlers under `src/app/api/**`. Unless noted, every route:

- Requires an authenticated Supabase session (checked via `supabase.auth.getUser()`), and
  returns `401 { "error": "Unauthorized" }` (or a sign-in-specific message) otherwise.
- Reads/writes are scoped to the current user, either via RLS (using the user-scoped
  `createClient()`) or, for tables the anon/authenticated role can't touch directly (e.g.
  encrypted API keys, credits), via the service-role `createAdminClient()` with an explicit
  `.eq("user_id", user.id)` filter.
- Validates request bodies with [Zod](https://zod.dev) and returns `400` with a human-readable
  `error` message on invalid input.

## Chat & Agent

### `POST /api/chat`

Runs the agent loop and streams the result over Server-Sent Events.

- **Auth**: required. Also requires `profile.has_paid && profile.credits > 0` (else `402
  { error, code: "NO_CREDITS" }`) and an active model config (else `400 { error, code:
  "NO_MODEL_CONFIG" }`).
- **Rate limited**: per-user sliding window (see [src/lib/rate-limit.ts](../src/lib/rate-limit.ts)); `429` if exceeded.
- **Body**: `{ chatId: string (uuid), content: string (1-8000 chars) }`
- **Response**: `text/event-stream`. Events: `thought`, `timeline`, `token`, `report`, `done`
  (`{ usage: { input_tokens, output_tokens, cached_tokens }, incomplete? }`), `error`.
- **Side effects**: saves the user message immediately; atomically decrements 1 credit
  (`decrement_credit` RPC, race-safe); refunds the credit (`refund_credit` RPC) if the loop
  errors before producing output; saves the assistant message + `usage_events` row + `reports`
  row (if a report was generated) once the stream completes.
- **Runtime**: `nodejs`, `maxDuration = 120`.

### `GET /api/chats`

List the current user's chats, most recently updated first.
**Response**: `{ chats: { id, title, created_at, updated_at }[] }`

### `POST /api/chats`

Create a new chat.
**Body**: `{ title?: string (max 120) }` (defaults to `"New research"`)
**Response**: `{ chat: { id, title, created_at, updated_at } }`

### `PATCH /api/chats/[id]`

Rename a chat.
**Body**: `{ title: string (1-120 chars) }`
**Response**: `{ chat: {...} }` or `404` if not found/not owned.

### `DELETE /api/chats/[id]`

Delete a chat (cascades to its messages/reports via foreign keys).
**Response**: `{ success: true }`

### `GET /api/chats/[id]/messages`

List all messages for a chat, ordered oldest-first.

## Model Configs

### `GET /api/model-configs`

List the current user's model configs with a masked key preview and per-model usage stats
(request count + cost, matched by model name against `usage_events`).
**Response**: `{ configs: { id, provider, label, base_url, model, is_default, masked_key, requests, cost_usd }[] }`

### `POST /api/model-configs`

Add a model config. The API key is encrypted (`encryptSecret`) before being stored; if
`is_default: true`, any previous default for this user is cleared first.
**Body**: `{ provider: "openai"|"anthropic"|"kimi"|"google"|"xai"|"openrouter"|"groq"|"custom", label: string, base_url: string (url), model: string, api_key: string (min 8 chars), is_default?: boolean }`

### `PATCH /api/model-configs/[id]`

Update a model config (e.g. set as default, rename, rotate key).

### `DELETE /api/model-configs/[id]`

Delete a model config.

### `POST /api/model-configs/[id]/test`

"Test Connection" — makes a real, minimal request to the provider's endpoint with the stored
key and reports differentiated success/failure (invalid key, unreachable endpoint, etc. — see
`humanizeError`).

## Reports

### `GET /api/reports`

List the current user's reports, most recent first.
**Response**: `{ reports: { id, chat_id, title, summary, created_at }[] }`

### `GET /api/reports/[id]/pdf`

Render and stream a PDF of a report (via `@react-pdf/renderer`).

### `POST /api/reports/[id]/share`

Generate (or reuse) a `share_token` for a report, scoped to the current user. Returns a
public share URL. Requires `0004_report_sharing.sql` to be applied (adds `reports.share_token`).

### `DELETE /api/reports/[id]/share`

Revoke sharing for a report (sets `share_token` back to `null`).

## Billing

### `POST /api/billing/checkout`

Create a Stripe Checkout session for a credit pack.
**Body**: `{ packId?: "starter"|"professional"|"power_user" }` (defaults to `starter`)
**Response**: `{ url: string, traceId: string }` — redirect the browser to `url`.

### `POST /api/billing/webhook`

Stripe webhook receiver. **Not user-authenticated** — authenticated instead by verifying the
`Stripe-Signature` header via `stripe.webhooks.constructEvent`. Excluded from the auth
middleware matcher in [src/proxy.ts](../src/proxy.ts). On `checkout.session.completed`, grants
credits via the idempotent `grant_payment_credits` RPC (guarded by a unique constraint on
`payments.stripe_session_id`, so retries/replays never double-credit).

### `GET /api/billing/confirm?session_id=...`

Fallback confirmation path for environments without a configured webhook — verifies the
session directly with Stripe, checks it belongs to the current user and is paid, then grants
credits through the same idempotent RPC as the webhook.

### `POST /api/billing/coupon`

Redeem a coupon code.
**Body**: `{ code: string }`
**Response**: `{ credits: number }` or `400` if invalid/already redeemed. Redemption is
race-safe (SQL `redeem_coupon` function only succeeds `WHERE coupon_used IS NULL`).

### `GET /api/billing/history`

Payment history + billing summary for the current user (current balance, total paid, total
research sessions, average cost per session).

## Analytics

### `GET /api/analytics?range=today|7d|30d|90d|lifetime`

Aggregated usage/cost analytics for the current user: totals, per-day/per-model breakdowns,
streak days, badges, founder insights, cost tips. Defaults to `30d`.

## Profile

### `GET /api/profile`

Current user's profile (credits, has_paid, coupon_used, etc.).

## Ops / Health

### `GET /api/health`

**Public, unauthenticated.** Returns `{ status: "healthy"|"degraded", version, database,
stripe, brave, uptimeSeconds }`. Never returns secret values. Safe to point an uptime monitor
or load balancer at.

### `GET /api/deployment-check`

Fuller deployment/config health check (all checks in [src/lib/health.ts](../src/lib/health.ts)
including encryption, PDF rendering, OAuth redirect config) plus a computed deployment score.
Backs the `/status` page.
