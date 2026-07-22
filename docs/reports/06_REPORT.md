# Report: Prompt 06 — Deployment & Reliability

## Metadata

- Prompt: `docs/prompts/06_DEPLOYMENT.md`
- Date: 2026-07-22
- Branch: main
- Commit Hash: (parent) `7fe27e94` → this commit
- Build Status: ✅ `npm run build` and `npm run lint` both pass with 0 errors/warnings (27 routes)

## Executive Summary

Added real health/observability infrastructure: a `/api/health` liveness endpoint, a deeper
`/api/deployment-check` endpoint that actually exercises the database, encryption, and PDF
pipelines (not just env-var presence), a public `/status` dashboard, in-process request/failure
metrics, retry logic for Brave Search, and structured failure logging + metrics wiring across
the chat, billing, PDF, and OAuth callback routes. `.env.example` already existed and was
reviewed for completeness (no changes needed).

Everything here is grounded in what this Next.js app can actually observe about itself in a
single serverless instance — there is no external APM, so uptime/latency/failure counters are
explicitly labeled "since last cold start" everywhere they're surfaced, rather than presented as
long-term metrics.

## Files Modified

- `src/lib/metrics.ts` (new) — in-process counters: total/failed requests, rolling latency
  samples (capped at 200), and per-kind failure counts (`timeout`, `pdf`, `stripe`, `auth`).
- `src/lib/health.ts` (new) — `getVersion()`, `checkDatabase()`, `checkStripeConfigured()`,
  `checkBraveConfigured()`, `checkEncryption()` (real encrypt/decrypt round-trip),
  `checkPdfGeneration()` (renders an actual throwaway PDF via `@react-pdf/renderer`),
  `checkOAuthRedirectConfig()`, `computeDeploymentScore()`, `getDeploymentWarnings()`.
- `src/app/api/health/route.ts` (new) — lightweight liveness endpoint (`status`, `version`,
  `database`, `stripe`, `brave`, `uptimeSeconds`).
- `src/app/api/deployment-check/route.ts` (new) — full check suite + deployment score +
  warnings + metrics snapshot.
- `src/app/status/page.tsx` (new) — public status dashboard consuming `/api/deployment-check`:
  per-service checklist, deployment warnings, and an observability panel.
- `src/lib/agent/brave-search.ts` — added retry logic (max 3 attempts, linear backoff) for
  transient failures (429/5xx/network errors); non-transient errors (missing key, 4xx) still
  fail immediately.
- `src/app/api/chat/route.ts` — wired `recordRequest(durationMs, failed)` and
  `recordFailure("timeout")` around the SSE stream lifecycle.
- `src/app/api/billing/checkout/route.ts` — added `recordFailure("stripe")` alongside the
  existing retry/logging on Stripe checkout-session creation failure.
- `src/app/api/billing/confirm/route.ts` — added `recordFailure("stripe")` on grant failure.
- `src/app/api/billing/webhook/route.ts` — added `recordFailure("stripe")` on webhook grant
  failure.
- `src/app/api/reports/[id]/pdf/route.ts` — the `catch {}` block previously swallowed errors
  silently; now logs `logger.error("pdf.render_failed", ...)` with the report ID and error
  message, and calls `recordFailure("pdf")`.
- `src/app/auth/callback/route.ts` — the failure path previously redirected silently; now logs
  `logger.warn("auth.callback_failed", ...)` and calls `recordFailure("auth")`.

## Features Added

- Public status page at `/status` (deployment score, per-check status badges, warnings,
  observability panel).
- `/api/health` and `/api/deployment-check` endpoints for uptime monitors / manual verification.
- Brave Search retry logic (transient-only, max 3 attempts).
- Deployment warning that correctly flags `/api/chat`'s `maxDuration = 120` exceeding Vercel's
  Hobby-plan 60s serverless limit — verified directly from `src/app/api/chat/route.ts`, not
  guessed.

## Bugs Fixed

- PDF generation route (`/api/reports/[id]/pdf`) was silently swallowing render errors with no
  logging — now logged with the report ID and underlying message.
- OAuth callback route was silently redirecting to the error page on `exchangeCodeForSession`
  failure with no logging — now logged as a warning.

## Security Improvements

- Both new health endpoints return only booleans/status labels/version — never raw secret
  values, consistent with the rest of the codebase's env-handling conventions.

## Performance Improvements

- None targeted in this prompt (Prompt 13 covers performance explicitly).

## Tests Performed

- `npm run build` — ✅ pass, 27 routes compiled, including the two new API routes and `/status`.
- `npm run lint` — ✅ pass, 0 errors/warnings.
- `get_errors` on all new/modified files — ✅ no diagnostics.
- Manually traced `checkPdfGeneration()`'s call into `ResearchReportDocument({ title, report })`
  against the real export in `src/lib/pdf/report.tsx` to confirm the shape matches
  (`{ title: string; report: ReportSummary }`).
- **Not performed** (no credentials/live environment available): actually hitting `/api/health`
  or `/api/deployment-check` over HTTP in a running server, live Brave Search retry behavior
  against a real flaky endpoint, live Stripe webhook failure simulation, live OAuth callback
  failure simulation. All verification here is via build, lint, and code tracing.

## Risks

- Metrics are per-instance and reset on cold start (documented prominently in `metrics.ts` and
  on the `/status` page) — they should not be mistaken for a real APM/metrics pipeline.
- `checkPdfGeneration()` renders a real (small) PDF on every `/api/deployment-check` call, which
  adds latency to that endpoint; acceptable since it's not on a hot path, but worth knowing if
  it's ever polled aggressively by an uptime monitor.
- `checkDatabase()` uses the service-role admin client to read from `profiles` — this bypasses
  RLS, but only ever returns a boolean status, not row data, to the caller.

## Remaining Work

- Migration `0002_security_and_credits.sql` is still **not applied** to the live Supabase
  database — this blocks the `credit_ledger` table used by analytics and all credit/coupon RPCs.
  This must be applied manually by a human with database access; it is out of scope for this
  agent to apply.
- No live credentials exist for Stripe, Brave Search, or any LLM provider in this environment,
  so end-to-end behavior of the retry logic and failure logging added here has not been
  exercised against real upstream failures — only unit-level code tracing.

## Rollback Plan

- All changes are additive (new files) or small, isolated logging/metrics calls added to
  existing catch blocks — reverting is a straightforward `git revert` of this commit with no
  schema or migration changes involved.

## Final Status

✅ Complete — build and lint pass cleanly; all planned Prompt 06 deliverables implemented.
