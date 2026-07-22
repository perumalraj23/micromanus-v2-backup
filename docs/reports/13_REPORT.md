# Prompt 13 Report — Performance Optimization

**Prompt:** [13_PERFORMANCE.md](../prompts/13_PERFORMANCE.md)
**Full details:** [PERFORMANCE_REPORT.md](./PERFORMANCE_REPORT.md)

## Summary

Profiled every area called out in the prompt (agent loop, Stripe, analytics, reports, PDF
generation) via code review, and measured build time directly (the one metric that's actually
reproducible in this credential-less environment). Found and fixed two real "sequential reads
that could be parallel" cases, added the missing DB indexes that every list/analytics query
was silently relying on RLS to sequential-scan without, added two safe HTTP cache headers, and
enabled Turbopack's build-time filesystem cache.

## Changes

- `supabase/migrations/0005_performance_indexes.sql` (new) — indexes on `messages`, `chats`,
  `reports`, `usage_events`, `model_configs`, `payments`, all backed by a real WHERE/ORDER BY
  in the route source. Not yet applied to the live DB (same status as `0002`–`0004`).
- `src/app/api/chats/[id]/messages/route.ts` — parallelized the messages + reports reads.
- `src/app/api/chat/route.ts` — parallelized chat-ownership/rate-limit/profile reads, and
  model-config/history reads, on the hottest route in the app. Error precedence unchanged.
- `src/app/api/health/route.ts` — added a 5s public cache header (uptime-monitor friendly).
- `src/app/api/reports/[id]/pdf/route.ts` — added a 1h private cache header (PDFs are
  immutable once a report exists — no edit endpoint).
- `next.config.ts` — enabled `experimental.turbopackFileSystemCacheForBuild`.

No business logic, response shapes, or architecture changed. See PERFORMANCE_REPORT.md §2 for
three specific optimizations that were *considered and deliberately not done* because they
would have changed business logic or added a dependency.

## Results (measured)

- Build time: ~40% faster on warm builds (11.1–11.6s → ~6.9s, 5 real runs, see
  PERFORMANCE_REPORT.md §3).
- `npm run build` — clean, same route table.
- `npm run lint` — clean.
- `npm run test` — 64/64 passing (unchanged suite from Prompt 11 — confirms the `Promise.all`
  reorderings didn't change observable behavior).

## Acceptance Criteria Check

| Criterion | Status |
|---|---|
| Build time improved | ✅ Measured, ~40% |
| No N+1 queries | ✅ Reviewed all routes; fixed the 2 found; none remaining |
| Analytics <2s | ⚠️ Not measurable without a live DB in this environment; code path is already O(n) single-pass and now indexed |
| Chat load <1s | ⚠️ Same constraint; route parallelized and indexed |
| Research response improved | ✅ `/api/chat` pre-loop gating: ~5 sequential round trips → ~2 parallel groups |

## Remaining Issues (carried forward, same as every prior prompt)

- No live Supabase/Stripe/Brave/LLM credentials in this environment — all validation is via
  build/lint/test/code review, not live load testing (the prompt's "50 concurrent users, 100
  chats, parallel Stripe events" validation goals cannot be executed here).
- Migrations `0002`–`0005` remain unapplied to the live database.
