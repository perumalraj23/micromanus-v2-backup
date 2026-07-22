# Report — 05: Analytics Platform

## Metadata

- Prompt: docs/prompts/05_ANALYTICS.md
- Date: 2026-07-22
- Branch: main
- Commit Hash: (see git log after commit)
- Build Status: PASS

## Executive Summary

Rebuilt `/api/analytics` and the Analytics page to add time filtering, trend charts, model
insights, founder insights, and several "wow factor" cards — all derived strictly from real rows
already in the schema (`usage_events`, `chats`, `reports`, `credit_ledger`). Deliberately did
**not** implement features that would require inventing data not present anywhere in the
database (e.g. topic categorization/"Top Categories", model latency, session duration, PDF
download counts) — see Remaining Work for why, and what would be needed to add them honestly.

## Files Modified

- `src/lib/types/app.ts` — extended `UsageTotals` with `range`, `daily`, `model_insights`,
  `credits_purchased`/`credits_consumed`, `founder_insights`, `weekly`, `streak_days`, `badges`,
  `cost_tip` (all additive; existing fields unchanged).
- `src/app/api/analytics/route.ts` — rewritten to accept `?range=today|7d|30d|90d|lifetime`,
  compute daily chat/report/cost aggregates for the selected range, per-model request counts and
  average cost, founder insights (most active weekday, most expensive/cheapest model, average
  report word count from real report summaries), a "this week" delta, a consecutive-day research
  streak, threshold-based achievement badges, and a cost-optimization tip when one model's
  average cost is at least 2x another's.
- `src/app/(app)/analytics/page.tsx` — added a time-range tab selector, a daily-volume bar chart,
  a cost-trend line chart, a credits purchased-vs-consumed chart, model insight cards, a founder
  insights card, a "this week" card, a cost-tip banner, and an achievements badge row. Kept the
  original "cost per model"/"cost per chat" charts and raw token stat cards.

## Bugs Fixed / Improvements (from the "Problems" list)

1. **Charts were basic / labels missing** — added axis labels, tooltips with currency
   formatting, and titled cards for every chart.
2. **No time filtering** — added a 5-way range selector (Today/7/30/90 days/Lifetime) that
   re-fetches and re-aggregates server-side.
3. **No trends** — added a daily research volume chart and a cost trend line chart.
4. **No comparisons** — added "credits purchased vs. consumed" and per-model cost comparison.
5. **No founder insights** — added a dedicated card (most active day, most/least expensive
   model, average report length).
6. **No usage timeline / research insights / WOW factor** — implemented the subset that can be
   computed honestly from existing data: Weekly Report card, Research Streak, and 5 threshold-
   based Achievement Badges (First Report, 10 Chats, 100 Chats, Power Researcher, 7 Day Streak).
7. **No cost optimization suggestions** — added a tip banner that only appears when there's a
   real ≥2x average-cost gap between two models actually used.
8. **No model performance metrics** — added per-model request count and average cost cards.

## Deliberately Not Implemented (and why)

- **Avg Latency per model** — no request timing is recorded anywhere in `usage_events` or the
  agent loop. Fabricating a plausible-looking number would violate the "no invented data"
  principle; a real implementation would need the agent loop to record start/end timestamps per
  completion call.
- **Top Categories / "Most researched topic"** — there is no topic/category field or NLP
  classification anywhere in the schema. Doing this honestly would require either an explicit
  tagging step (e.g. classifying chat titles with an LLM call) or a new column — a real feature,
  but a separate scoped piece of work, not something to fake with static labels.
- **Heatmap, Leaderboard-style stats ("Top 1% researcher"), "hours researching", "articles
  read"** — none of these are backed by any real per-user or cross-user data (no read count, no
  session duration, no aggregate percentile computation across users). Listed as Remaining Work.
- **Timeline of "11:21 started research… 11:24 downloaded PDF"** — PDF downloads aren't logged
  anywhere (the PDF route is a stateless render, see `src/app/api/reports/[id]/pdf/route.ts`); a
  real per-action timeline would need an event log table, out of scope for this pass.

## Test Cases (from the prompt)

| Test | Expected | Result |
|---|---|---|
| New user | empty states | Every chart already renders an `EmptyChart` "No usage yet" placeholder when its dataset is empty (unchanged behavior, still correct with the new charts). |
| Time filter switch | data re-aggregates | Verified via code trace: `range` state change re-fetches `/api/analytics?range=...`, and the route re-buckets `daily` based on `rangeStart`. |

## Tests Performed

- `npm run build` / `npm run lint` — pass (one type error caught and fixed: `by_model` didn't
  carry a `requests` count, so `model_insights` is now built from the raw aggregation map instead
  of derived from `by_model`).
- Manual review of the aggregation logic (day bucketing via `toISOString().slice(0,10)`, weekday
  naming, streak calculation walking backward from today).
- **Not performed:** visual/browser verification of the charts with real usage data (no live
  LLM provider key to generate real `usage_events` rows in this environment), and verifying the
  `credit_ledger` query works against a live DB (guarded with a try/catch-equivalent — the route
  falls back to zero purchased/consumed if the table doesn't exist yet, i.e. before migration
  0002 is applied).

## Risks

- `credits_purchased`/`credits_consumed` will read as `0/0` until migration 0002 is applied
  (same dependency as 02/03/04) — the route degrades gracefully (checks `ledgerResult.error`)
  rather than throwing.
- Founder insights based on small sample sizes (e.g. one or two data points) can look
  statistically overconfident ("Most active day: Tuesday" from a single event). This is a
  reasonable trade-off for an early-stage product and matches the prompt's own example format;
  flagged here for awareness rather than treated as a bug.

## Remaining Work

- Avg latency per model, topic categorization, activity heatmap, cross-user leaderboard
  percentile, and a granular action timeline are not implemented — each would require either a
  new schema field/event log or cross-user aggregation not currently supported by RLS (each
  policy scopes to `auth.uid()`), and are flagged as real follow-up scope rather than faked.

## Rollback Plan

`git revert` the commit for this prompt. Purely additive to the type and route; the page rewrite
can be reverted independently if needed.

## Final Status

Time filtering, trend charts, model insights, founder insights, and grounded WOW-factor cards
implemented and build/lint-verified. Speculative/unverifiable metrics were intentionally left
out rather than fabricated.
