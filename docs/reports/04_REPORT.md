# Report — 04: Stripe & Billing Platform

## Metadata

- Prompt: docs/prompts/04_STRIPE.md
- Date: 2026-07-22
- Branch: main
- Commit Hash: (see git log after commit)
- Build Status: PASS

## Executive Summary

Hardened the existing checkout/webhook/confirm flow (already partly fixed alongside 02/03:
idempotent crediting, signature validation, Origin-header removal) and closed the remaining gaps
called out in the prompt: a single hardcoded $5 pack, no billing history, no trace IDs, and no
retry on transient Stripe errors. Added three payment tiers (Starter/Professional/Power User), a
`/api/billing/history` endpoint, a billing dashboard + payment history table in Settings, and
per-request trace IDs surfaced in checkout error responses for support correlation.

## Files Modified

- `src/lib/stripe.ts` — added `PAYMENT_PACKS` (Starter $5/5cr, Professional $20/25cr, Power User
  $50/100cr) and `getPaymentPack(id)`; kept `CREDIT_PACK` as a deprecated alias for backward
  compatibility (still points at Starter).
- `src/app/api/billing/checkout/route.ts` — accepts an optional `{ packId }` JSON body (falls
  back to Starter); generates a `traceId` (`newRequestId()`) returned in both success and error
  responses; retries once on a 5xx from Stripe before giving up; the pack id and trace id are
  now included in the session `metadata`, and `logger.info`/`logger.error` calls include the
  trace id for correlation.
- `src/app/api/billing/history/route.ts` (new) — returns the current user's payment rows
  (via RLS "payments: read own", no admin client needed) plus a summary (current balance, total
  payments $, total research sessions, average cost) derived from `profiles.credits` and
  `usage_events.cost_usd`.
- `src/app/paywall/page.tsx` — replaced the single "Pay $5" button with a list of the three
  payment packs (label, credits, price, description); each triggers checkout with its `packId`;
  generalized the coupon/success copy that previously hardcoded "5 credits"; switched
  `window.location.href = ...` to `window.location.assign(...)` (see Issues Encountered).
- `src/app/(app)/settings/page.tsx` — added a "Billing" section: 4 stat cards (Current Balance,
  Total Payments, Research Sessions, Average Cost) sourced from `/api/billing/history`, plus a
  payment history table (Date/Amount/Credits/Status/Payment ID).

## Bugs Fixed

1. **Only one $5/5-credit pack existed** — added Professional and Power User tiers without any
   schema change; the checkout/webhook/confirm routes already derived credits/amount from Stripe
   session metadata rather than a hardcoded constant, so adding packs required no changes to the
   crediting logic itself.
2. **No trace IDs / poor observability** — every checkout request now gets a `traceId` that is
   logged alongside the Stripe session id and returned to the client in both success and error
   JSON, so a user-reported "checkout failed" can be correlated to a specific server log line.
3. **No retry for transient Stripe errors** — checkout now retries once on a 5xx from the Stripe
   API before surfacing the friendly error.
4. **No billing history** — `/api/billing/history` + the Settings "Billing" section.
5. **No payment analytics / dashboard** — the four stat cards in Settings (balance, total spend,
   session count, average cost per session) fulfill the "Billing Dashboard" WOW factor using
   data that already existed (`profiles.credits`, `payments`, `usage_events`).

## Security / Reliability (carried over from 02/03, restated here since this prompt asks to
verify the full flow end-to-end)

- Webhook signature verification (`stripe.webhooks.constructEvent`) — unchanged, already correct.
- Idempotent crediting via `grant_payment_credits` + `unique(payments.stripe_session_id)` — a
  Stripe retry/replay of the same `checkout.session.completed` event cannot double-credit.
- Origin header is never trusted for redirect URLs (fixed in 02).
- Checkout never returns a raw, unstructured 500 — the catch block always returns a friendly
  JSON error with a trace id.

## Test Cases (from the prompt)

| Test | Expected | Result |
|---|---|---|
| Buy Starter/Professional/Power User pack | correct credits granted for each | Verified by code trace — `checkout` passes `packId` → Stripe metadata → `webhook`/`confirm` read `credits` from that same metadata, so all three tiers flow through the same, already-idempotent crediting path. Not exercised live (placeholder Stripe key in this environment). |
| Webhook replay | no duplicate credit | Enforced by the `payments.stripe_session_id` unique constraint (see 02/03 reports). |
| Checkout transient failure | one retry, then friendly error (no raw 500) | Implemented; not exercised against a live flaky endpoint. |
| Billing history reflects real payments | table populated | Reads directly from `payments`/`usage_events`/`profiles` — reflects whatever is actually in the DB. |

## Tests Performed

- `npm run build` / `npm run lint` — pass (after fixing one lint issue, see below).
- Manual code trace of `packId` flowing from the paywall UI → checkout route → Stripe session
  metadata → webhook/confirm routes → `grant_payment_credits`.
- **Not performed:** an actual Stripe sandbox checkout (placeholder `STRIPE_SECRET_KEY`/
  `STRIPE_WEBHOOK_SECRET` in `.env.local`), and applying `0002_security_and_credits.sql` to the
  live DB (same blocker as 02/03).

## Issues Encountered

- `npm run lint` flagged `window.location.href = data.url;` in the rewritten paywall page with
  `react-hooks/immutability`: "Modifying a variable defined outside a component or hook is not
  allowed." The identical pattern elsewhere in the codebase (`src/components/layout/sidebar.tsx`)
  did not trigger it, so this appears to be a narrow/inconsistent rule interaction rather than a
  blanket ban. Fixed by using `window.location.assign(data.url)` instead, which the rule accepts.

## Risks

- Same as 02/03: all Stripe-dependent code paths are unverified live in this environment.
- Adding tiers changes the Stripe Checkout line-item description text per pack; no impact on
  existing Starter purchases since its id/price/credits are unchanged.

## Remaining Work

- A dedicated "Billing Timeline" (Payment Initiated → Completed → Credits Granted → Coupon
  Applied → Refund Issued) event feed was not built as a separate UI; the underlying data exists
  across `payments` and the new `credit_ledger` (03_REPORT.md) and could be merged into one
  timeline view in a follow-up.
- "Billing Badges" (Sandbox User / Paid User) were not added to the UI in this pass — low
  priority, cosmetic, deferred to keep this prompt's scope on the functional billing gaps.

## Rollback Plan

`git revert` the commit for this prompt. No schema changes were required for the pack tiers
themselves (only migration 0002, shared with 02/03, needs the documented manual apply step).

## Final Status

Multi-tier packs, billing history/dashboard, trace IDs, and retry logic implemented and
build/lint-verified. Live Stripe verification deferred pending real sandbox credentials.
