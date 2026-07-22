# MicroManus — Performance Report

**Prompt executed:** [13_PERFORMANCE.md](../prompts/13_PERFORMANCE.md)
**Environment constraint (same as every prior prompt):** no live Supabase/Stripe/Brave/LLM
credentials are available in this environment. Every metric below is either (a) measured
directly by running the real build/test suite in this repo, or (b) reasoned about from the
actual SQL/route source with the query/index in front of me — nothing here is a fabricated
benchmark or an invented number.

---

## 1. What was profiled

| Area | Method | Finding |
|---|---|---|
| Agent loop (`src/lib/agent/loop.ts`) | Code review | Already a single sequential Think→Tool→Observe generator; no redundant DB/network calls per iteration beyond the one completion call and (optionally) one Brave Search call. Nothing to parallelize without changing behavior — a research loop is inherently sequential (each step depends on the model's prior output). |
| Stripe (`checkout`, `webhook`, `confirm`) | Code review | `checkout` and `confirm` already retry only on transient 5xx (bounded, 2 attempts). `webhook` does one signature-verified event → one idempotent RPC call. No N+1 patterns found. |
| Analytics (`src/app/api/analytics/route.ts`) | Code review + query trace | 5 reads already run via a single `Promise.all` (profile, chats, usage_events, reports, credit_ledger) — good. The aggregation loop over `usage`/`chats`/`reports` is a single O(n) pass using `Map`/`Set`, not O(n²) — good. **Bottleneck found:** none of `chats`, `usage_events`, or `reports` had a supporting index on `user_id` (RLS still has to scan), so every analytics load was a sequential scan under load. Fixed via migration (see §2). |
| Reports (`GET /api/chats/[id]/messages`) | Code review | **Bottleneck found:** `messages` and `reports` were fetched *sequentially* even though neither depends on the other's result. Fixed (see §2). |
| PDF generation (`src/app/api/reports/[id]/pdf/route.ts`) | Code review | `renderToBuffer` (`@react-pdf/renderer`) is CPU-bound and unavoidable per-request work — reports have no edit endpoint, so a given report's PDF is deterministic. Added a `private` cache header so repeat downloads of the same report by the same browser don't force a second render (see §2). |
| Build | Measured (`time npm run build`, 4 real runs) | See §3 — this is the one area with hard, reproducible before/after numbers in this environment. |

---

## 2. Changes made

All changes are additive/config-level or reorder independent reads into `Promise.all` — **no
business logic, response shapes, or architecture changed.** Verified via the full `npm run
build` / `npm run lint` / `npm run test` cycle after each change (all green, see §4).

1. **`supabase/migrations/0005_performance_indexes.sql`** (new) — adds indexes actually backed
   by a WHERE/ORDER BY clause found in the route source:
   - `messages (chat_id, created_at)` — agent history + message list reads.
   - `chats (user_id, updated_at desc)` — chat list + ownership checks.
   - `reports (user_id, created_at desc)` and `reports (chat_id)` — report list + analytics join.
   - `usage_events (user_id, created_at desc)` and `usage_events (user_id, model)` — the
     largest, fastest-growing table; scanned in full on every Analytics load.
   - `model_configs (user_id)` — looked up on every `/api/chat` request via `getActiveModelConfig`.
   - `payments (user_id, created_at desc)` — billing history.
   - **Not yet applied** to the live database in this environment, same status as migrations
     `0002`–`0004` (see [DEPLOY_CHECKLIST.md](../DEPLOY_CHECKLIST.md)) — a human with DB
     credentials must run it.

2. **`src/app/api/chats/[id]/messages/route.ts`** — the `messages` select and the `reports`
   select (used only to attach `report_id` to each message) are independent once chat ownership
   is confirmed. Changed from two sequential `await`s to one `Promise.all`.

3. **`src/app/api/chat/route.ts`** — two independent-read groups converted from sequential
   `await`s to `Promise.all`, with identical error precedence preserved:
   - Chat-ownership lookup, rate-limit check, and profile/credits lookup (3 round trips → 1).
   - `getActiveModelConfig` and the 40-message history read (2 round trips → 1).
   This is the hot path for every single chat message sent — the most latency-sensitive route
   in the app — so it's where parallelizing independent reads matters most.

4. **`src/app/api/health/route.ts`** — added `Cache-Control: public, max-age=5,
   stale-while-revalidate=10`. This is a public, non-sensitive, frequently-polled
   (uptime-monitor) endpoint; a 5s cache meaningfully cuts DB pings under monitoring load
   without making the health signal meaningfully stale.

5. **`src/app/api/reports/[id]/pdf/route.ts`** — added `Cache-Control: private, max-age=3600,
   immutable`. Reports have no edit endpoint, so a given report id's rendered PDF never
   changes; `private` (not `public`) keeps it out of shared caches/CDNs since it's
   authenticated, per-user content.

6. **`next.config.ts`** — enabled `experimental.turbopackFileSystemCacheForBuild`. Confirmed via
   `node_modules/next/dist/docs/01-app/03-api-reference/08-turbopack.md` and
   `.../turbopackFileSystemCache.md` that Turbopack is already the default bundler in this Next.js
   version (16.2.10) and that build-time filesystem caching is an explicit opt-in flag, stable for
   dev but experimental for production builds — enabled anyway since the measured win (§3) is
   large and the risk is limited to CI build-cache staleness, not runtime behavior.

### Considered, deliberately not done (would have changed business logic)

- **Filtering `usage_events`/`chats`/`reports` by date range at the DB level in `/api/analytics`.**
  Reading the route closely: `totals.input_tokens`/`total_cost_usd`/`by_model` etc. are summed
  over *all* rows regardless of the selected `range`, while only `daily`/`weekly`/`streak_days`
  apply an in-memory range filter. Pushing a `.gte("created_at", rangeStart)` into the query
  would reduce rows transferred, but would also silently change what `totals.total_cost_usd`
  means for a non-"lifetime" range — a behavior change, not a performance change. Left
  unchanged and flagged here instead of "fixed," per the prompt's "do not change business
  logic" rule.
- **Adding `.limit()`/pagination to `/api/chats`, `/api/reports`, or the messages list.** Would
  reduce payload size for power users but would also change what data the client receives
  (silently hiding older chats/reports/messages) without a corresponding UI pagination
  affordance. Documented as a recommendation (§5) instead of implemented.
- **Message-list virtualization for very long conversations.** Would require a new dependency
  (e.g. `react-window`), which conflicts with "no unnecessary dependencies." The agent loop
  already caps *its own* context read to the last 40 messages via `.limit(40)`
  (`src/app/api/chat/route.ts`) — only the UI's full-history read is unbounded. Documented as a
  recommendation.

---

## 3. Before / after — build time (real, measured in this environment)

Ran `npm run build` repeatedly, alternating cold (`rm -rf .next` first) and warm runs, both
before and after enabling `turbopackFileSystemCacheForBuild`. Wall-clock via `time`, this
machine, same code, no other changes running concurrently.

| Run | Cache enabled? | Cold/warm | Wall time |
|---|---|---|---|
| 1 | No (baseline) | Cold (`.next` removed) | 11.10s |
| 2 | No (baseline) | Warm (repeat, same config) | 11.60s |
| 3 | Yes | Cold (first run, populates cache) | 12.55s |
| 4 | Yes | Warm (cache hit) | 6.88s |
| 5 | Yes | Warm (repeat, confirms it's stable) | 6.91s |

**Result: ~40% faster warm builds (11.1–11.6s → ~6.9s)** once the Turbopack build cache is
populated. The very first build after enabling the flag is slightly *slower* (12.55s) because it
has to populate the cache — expected and documented in Next.js's own docs. In CI/local dev,
almost every build after the first is a "warm" build, so this is the representative number.

Final build after all code changes in this report (§2, items 2–5) still compiles cleanly with
the same route table as before this prompt (no route added/removed):

```
✓ Compiled successfully in 5.1s
Running TypeScript ...
Finished TypeScript in 4.7s
```

---

## 4. Validation

- `npm run build` — clean, all routes compile, same route table as pre-existing (no route
  added/removed).
- `npm run lint` — clean, no new warnings/errors.
- `npm run test` — **64/64 passing**, same suite as Prompt 11, confirming the `Promise.all`
  reordering in `/api/chat` and the messages route didn't change any tested behavior (the
  `POST /api/billing/coupon` route test and all pure-logic tests are unaffected since none of
  those files were touched).

## 5. Recommendations (not implemented — out of scope / would change behavior or add deps)

1. Apply `0002`–`0005` migrations to the live database — `0005` (this prompt's indexes) has zero
   effect until it's actually run; everything else in this report is future-proofing until then.
2. If/when conversation histories grow very large in practice, add pagination to the messages
   list endpoint plus a "load older messages" UI affordance, rather than sending the full
   history on every chat open.
3. If the Analytics page's `total_*` fields are meant to reflect the selected range (not
   lifetime), that's a product decision to confirm with the team before changing the query —
   flagged here as an observation, not fixed.
4. Consider a Redis-backed (or Vercel KV) rate limiter instead of the current Postgres-backed
   one if `api_requests` insert volume becomes a write bottleneck at higher concurrency — the
   current implementation already fails open on error, so this is a scaling concern, not a
   correctness one.

## Acceptance Criteria Check

| Criterion | Status |
|---|---|
| Build time improved | ✅ ~40% faster warm builds, measured (§3) |
| No N+1 queries | ✅ Reviewed every route; fixed the two sequential-independent-read cases found (chat route, messages route); no true N+1 (per-row query in a loop) patterns exist anywhere in the codebase |
| Analytics <2s | ⚠️ Cannot be measured without a live database in this environment; the aggregation code itself is O(n) single-pass and now has supporting indexes once `0005` is applied — no code-level bottleneck remains |
| Chat load <1s | ⚠️ Same constraint as above; the messages route's two reads are now parallelized and indexed |
| Research response improved | ✅ `/api/chat`'s pre-agent-loop gating went from ~5 sequential DB round trips to ~2 parallel round-trip groups |
