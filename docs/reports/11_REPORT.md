# TESTING_REPORT.md

## Metadata

- Prompt: `docs/prompts/11_TESTING.md` — Comprehensive Testing & Validation
- Scope: Add an automated test suite (none previously existed) covering the highest-value,
  highest-risk pure logic in the codebase, and re-verify the founder journey / failure
  scenarios at the code level.
- Environment constraint (unchanged since Prompt 06): no live Google/GitHub OAuth, Stripe
  sandbox, Brave Search, or LLM provider credentials are available in this environment, so
  "testing" here means (a) real, executable automated unit/route tests for logic that can run
  without live credentials, and (b) code-level verification/tracing for everything else. No
  test result in this report is fabricated — every number below comes from an actual `npm run
  test` execution.

## Test Framework Added

No test framework existed before this prompt (`package.json` had no `test` script and no
Vitest/Jest dependency). Added:

- `vitest` (devDependency) — chosen over Jest for zero-config TypeScript/ESM support and
  fast startup, matching the "don't add dependencies unless necessary" rule (a single
  package, no DOM/testing-library needed since the highest-value logic here is pure
  functions and route handlers, not React components).
- `vitest.config.mts` — path alias (`@` → `src`), Node test environment.
- `npm run test` → `vitest run`.

**Note on environment friction**: the sandboxed Node install initially failed with `Cannot
find native binding` (a known `rolldown`/npm optional-dependency bug — npm/cli#4828) and then
an ESM/CJS `ERR_REQUIRE_ESM` loading the config file. Both were resolved without touching any
application code: installing the missing platform binding (`@rolldown/binding-linux-x64-gnu`)
and naming the config `vitest.config.mts` instead of `.ts` so Node loads it as ESM.

## Test Results Summary

```
npm run test
 Test Files  7 passed (7)
      Tests  64 passed (64)
```

| Suite | File | Tests | Result |
|---|---|---|---|
| Crypto (API key encryption at rest) | [src/lib/crypto.test.ts](../../src/lib/crypto.test.ts) | 8 | PASS |
| Pricing / credit cost engine | [src/lib/pricing.test.ts](../../src/lib/pricing.test.ts) | 7 | PASS |
| Utils (formatting + error humanization) | [src/lib/utils.test.ts](../../src/lib/utils.test.ts) | 15 | PASS |
| Stripe payment packs & coupon | [src/lib/stripe.test.ts](../../src/lib/stripe.test.ts) | 6 | PASS |
| Health checks / deployment score | [src/lib/health.test.ts](../../src/lib/health.test.ts) | 14 | PASS |
| Brave Search agent tool (retry/failure) | [src/lib/agent/brave-search.test.ts](../../src/lib/agent/brave-search.test.ts) | 6 | PASS |
| Coupon redemption route (auth + race guard) | [src/app/api/billing/coupon/route.test.ts](../../src/app/api/billing/coupon/route.test.ts) | 8 | PASS |

## Goal 2 — "Add tests for: Agent Loop, Stripe, Credits, Coupons, Authentication, Chats, Reports"

| Area | Coverage | Result |
|---|---|---|
| Agent Loop | `brave-search.test.ts` covers the research tool's retry/backoff logic used by the loop (`src/lib/agent/loop.ts` calls `braveSearch`) — success path, 429 retry-then-succeed, persistent 5xx exhausting retries, persistent 401 exhausting retries, network-error retry. | PASS (6/6) |
| Stripe | `stripe.test.ts` validates `PAYMENT_PACKS` invariants (unique ids, positive price/credits), `getPaymentPack` fallback behavior, deprecated `CREDIT_PACK` alias. | PASS (6/6) |
| Credits | `pricing.test.ts` validates the actual cost-calculation engine (`estimateCost`/`findPricing`) that every credit deduction is derived from — billable-input math, cache-savings math, unknown-model fallback, no negative costs. | PASS (7/7) |
| Coupons | `route.test.ts` (coupon route) covers invalid code rejection, case-insensitive matching, and — critically — the double-redemption race guard (RPC returning `null` when `coupon_used` is already set). | PASS (8/8) |
| Authentication | Same `route.test.ts` verifies an unauthenticated request is rejected with 401 *before* any coupon/database logic runs. | PASS (1/1 relevant case) |
| Chats / Reports | **Not covered by new automated tests.** These routes (`src/app/api/chats/**`, `src/app/api/reports/**`) are almost entirely thin wrappers around Supabase queries with RLS enforcement — testing them meaningfully would require either a live Supabase instance or introducing a database-mocking dependency, which conflicts with the prompt's "don't add dependencies unless absolutely necessary" instruction. Verified instead by code review (see Founder Journey table below) and by the fact that `npm run build`/`npm run lint` type-check every route handler against the real Supabase-generated types in [src/lib/types/database.ts](../../src/lib/types/database.ts). | Code-reviewed only |

## Goal 1 — Founder Journey (re-verified, code-level)

The full 12-step founder journey was already exhaustively verified in
[docs/reports/10_REPORT.md](./10_REPORT.md) (Prompt 10 audit). Re-confirmed unchanged here
since no source code changed between Prompt 10 and this prompt until the test suite was added:

| Step | Status |
|---|---|
| Landing → Login (Google/GitHub OAuth) | Code-verified, not live-tested (no OAuth credentials in this environment) |
| Coupon flow | **Now also unit-tested** (`route.test.ts`) — code + auth + race-guard verified |
| Stripe checkout/webhook/confirm | Code-verified (real `stripe.webhooks.constructEvent` signature check); pack math unit-tested |
| Model configuration (encrypt/store/test key) | Encryption round-trip now unit-tested (`crypto.test.ts`) |
| Research / Agent loop / Report generation | Search-tool retry/failure now unit-tested; loop orchestration itself remains code-reviewed only (requires a live LLM provider to execute end-to-end) |
| PDF export, Analytics, Logout | Unchanged from Prompt 10 — code-verified |

## Goal 3 — Leak / Race / Reliability Checks

| Check | Finding |
|---|---|
| No credit leaks | `estimateCost` is deterministic and unit-tested; the actual ledger write (`decrement_credit` SQL RPC in migration `0002_security_and_credits.sql`) is **not applied to the live database** (longstanding blocker, flagged since Prompt 02) — cannot be exercised end-to-end in this environment. |
| No double payments | Stripe webhook idempotency relies on Stripe's event `id` plus the `/api/billing/confirm` fallback checking existing `stripe_session_id` rows — code-reviewed, not live-tested (no Stripe sandbox credentials). |
| No race conditions | The one race condition with a concrete server-side guard — coupon double-redemption — is now unit-tested and passes. Credit decrement races are guarded by the same `WHERE`-clause pattern in SQL (per code comments) but, again, that migration isn't live. |
| No SSE failures | `src/lib/hooks/use-agent-stream.ts` and `src/app/api/chat/route.ts` (SSE producer) were code-reviewed; no automated test added (would require a real streaming HTTP round-trip, out of scope without adding an HTTP-mocking dependency). |
| No orphan records | Chat/message/report creation all cascade via foreign keys with `on delete cascade` per `supabase/migrations/0001_init.sql` — verified by reading the schema, not executed against a live database. |

## Goal 4 — Failure Scenario Tests

| Scenario | Where tested | Result |
|---|---|---|
| Invalid API key | `utils.test.ts` (`humanizeError` maps 401/"invalid API key" → friendly message) | PASS |
| Rate limits (429) | `utils.test.ts` (`humanizeError`) + `brave-search.test.ts` (retries a real 429 then succeeds) | PASS |
| Missing env vars | `health.test.ts` — `checkStripeConfigured`/`checkBraveConfigured`/`checkOAuthRedirectConfig`/`checkEncryption`/`getDeploymentWarnings` all exercised with env vars deleted | PASS |
| Supabase outage | `route.test.ts` (coupon route) — RPC returning an `error` object surfaces a generic 500 without leaking the raw DB error message | PASS |
| Stripe outage | Not independently unit-tested (would require mocking the `stripe` SDK's HTTP layer); `getStripe()` already throws a clear error when `STRIPE_SECRET_KEY` is absent, covered indirectly by `checkStripeConfigured` in `health.test.ts`. | Partial |
| Brave Search failure | `brave-search.test.ts` — persistent 5xx and network errors both exhaust retries and throw a descriptive error | PASS |
| OpenAI/Gemini 429 | `utils.test.ts` (`humanizeError`) maps this generically for any provider (the agent loop calls the OpenAI SDK against 8 different providers' base URLs, and 429 handling is provider-agnostic by design) | PASS |

## Remaining Issues

1. **Blocking (carried forward from every report since Prompt 02)**: migrations
   `0002_security_and_credits.sql`, `0003_model_providers.sql`, `0004_report_sharing.sql` are
   not applied to the live Supabase database — no credit ledger, coupon, or share-token test
   can be run end-to-end against a real database in this environment.
2. No live-credential integration tests exist for OAuth, Stripe, Brave Search, or any LLM
   provider — all failure-scenario coverage above is at the unit/mocked level.
3. Chats and Reports API routes have no automated tests (only code review) — would need a
   Supabase test project or a mocking dependency to test meaningfully.
4. SSE streaming (`/api/chat`) has no automated test.

## Recommendations

1. Once a human applies the three pending migrations to a real (or staging) Supabase project,
   add integration tests against that project for `decrement_credit`/`refund_credit`/
   `redeem_coupon`/`grant_payment_credits`, specifically concurrent-request race tests.
2. Consider `msw` (Mock Service Worker) only if/when live-credential-style integration testing
   becomes a real requirement — not added now per the "no unnecessary dependencies" rule.
3. Add a lightweight smoke test for `/api/chat`'s SSE response shape once a staging LLM key is
   available.

## Acceptance Criteria Check

- Entire founder journey passes: **code-verified**, not live-tested (unchanged constraint).
- Zero critical bugs remain: none found in this pass; the only "bugs" are pre-existing
  environment/credential gaps documented since Prompt 02, not code defects.
- Build passes: confirmed (`npm run build` — 30 routes, 0 errors).
- Lint passes: confirmed (`npm run lint` — 0 errors, including the 7 new test files).
- Production deployment succeeds: unchanged from Prompt 06/10 — blocked only by the pending
  migrations, not by anything introduced in this prompt.
