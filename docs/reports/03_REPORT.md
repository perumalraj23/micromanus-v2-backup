# Report — 03: Credit System Hardening

## Metadata

- Prompt: docs/prompts/03_CREDITS.md
- Date: 2026-07-22
- Branch: main
- Commit Hash: (see git log after commit)
- Build Status: PASS

## Executive Summary

Replaced every non-atomic `credits = profile.credits - 1` (or `+ n`) read-then-write with
race-safe, single-statement SQL (`UPDATE ... WHERE credits > 0 RETURNING credits`) exposed as
Postgres RPCs, and wired the chat route to refund exactly once for every failure mode listed in
the prompt: agent errors, empty responses, max-iteration exhaustion, and client aborts. All
credit-affecting RPCs write to a new `credit_ledger` audit table.

## Files Modified

- `supabase/migrations/0002_security_and_credits.sql` — `decrement_credit`, `refund_credit`,
  `redeem_coupon`, `grant_payment_credits` SQL functions + `credit_ledger` table (shared with
  02_REPORT.md; this is the same migration).
- `src/app/api/chat/route.ts` — credit decrement now goes through `decrement_credit` (atomic,
  race-safe: `WHERE credits > 0`); a `refundOnce()` helper guarantees at most one refund per
  request; refund is triggered on: agent-loop error, empty final answer, max-iteration exhaustion
  without a report/answer, and client abort (via the stream's `cancel()` callback, which fires
  when the client disconnects mid-stream).
- `src/app/api/billing/coupon/route.ts` — coupon redemption now goes through `redeem_coupon`,
  which only succeeds `WHERE coupon_used IS NULL`, closing the race described in the prompt
  (two simultaneous redemption requests can no longer both succeed).
- `src/components/chat/chat-window.tsx` — call `router.refresh()` after an error/refund and
  ~500ms after a manual stop, so the sidebar credit counter (server component,
  `src/app/(app)/layout.tsx`) doesn't show a stale, already-refunded balance until the next full
  navigation.

## Bugs Fixed

1. **Non-atomic decrement** (`credits = profile.credits - 1`) — replaced with
   `decrement_credit()`, a single `UPDATE ... WHERE credits > 0 RETURNING credits`.
2. **Refund used a stale value** (`credits: profile.credits`, computed before the decrement) —
   replaced with `refund_credit()`, which does `credits = credits + 1` directly in SQL (always
   relative to the current row, never a value read earlier in the request).
3. **Multiple tabs / concurrent requests could both decrement the last credit** — the `WHERE
   credits > 0` guard means only one concurrent request can win; the other gets `null` back and
   a `402 NO_CREDITS` response, matching the prompt's test case.
4. **SSE failures / client aborts consumed credits** — the `ReadableStream`'s `cancel()` handler
   (previously absent) now calls `refundOnce("client_abort")`.
5. **Empty responses consumed credits** — the agent loop now emits a distinct `{ type: "empty"
  }` event (see 01_REPORT.md) instead of silently completing; the route refunds and tells the
  user their credit was returned.
6. **Max-iteration exhaustion was indistinguishable from success** — the loop now flags
   `incomplete: true`; the route only refunds if nothing usable (no report, no non-empty answer)
   was actually produced, so hitting the step limit *after* generating a report still counts as
   a successful (billable) research session.
7. **Coupon redemption was raceable** (`profile?.coupon_used` read, then a separate `update`) —
   replaced with `redeem_coupon()`, atomic and `WHERE coupon_used IS NULL`.
8. **No audit trail** — every RPC (`decrement_credit`, `refund_credit`, `redeem_coupon`,
   `grant_payment_credits`) inserts a row into `credit_ledger` (`delta`, `balance_after`,
   `reason`, optional `reference_id`).
9. **Sidebar credit count went stale** — `router.refresh()` added on the error/abort paths
   (the success path already called it).

## Test Cases (from the prompt)

| Test | Expected | Result |
|---|---|---|
| Credits = 1, two tabs send simultaneously | only one succeeds | **Enforced in SQL** via `WHERE credits > 0`; the loser gets `NO_CREDITS`. Not exercised against a live DB in this session (migration not yet applied — see 02_REPORT.md). |
| Credits = 0 | `NO_CREDITS` | Enforced both by the pre-check (`profile.credits <= 0`) and, redundantly, by `decrement_credit` returning `null`. |
| Abort mid-request | refund issued | `cancel()` → `refundOnce("client_abort")`. |
| Provider timeout | refund issued | Surfaces as an `error` event from the agent loop → refunded. |
| Stripe webhook replay | no duplicate credits | See 04_REPORT.md (`grant_payment_credits`). |
| Apply coupon twice | second attempt rejected | `redeem_coupon` returns `null` on the second call; route responds 400. |
| Empty response | credit refunded | New `empty` event path → `refundOnce("empty_response")`. |

## Tests Performed

- `npm run build` / `npm run lint` — pass.
- Manual trace of every code path in the new `route.ts` that leads to `refundOnce` vs. a
  successful save, cross-checked against the "DO NOT refund when" list in the prompt (valid
  response generated / report generated successfully) — both remain billable.
- **Not performed:** live concurrency test (two simultaneous requests against a real Supabase
  project) and a live Stripe webhook replay — blocked on the same missing DB/psql access noted
  in 02_REPORT.md, and no live LLM provider key to actually trigger a real agent run.

## Risks

- Everything in this report depends on `0002_security_and_credits.sql` being applied — until
  then, every `admin.rpc(...)` call in the chat/coupon/billing routes will fail. This is called
  out prominently in 02_REPORT.md's Remaining Work.
- `refundOnce` is per-request in-memory state; it does not protect against the extremely narrow
  window where the process itself crashes between decrementing and the stream closing. A
  reconciliation job (comparing `usage_events`/`credit_ledger` deltas against `profiles.credits`)
  would close that last gap but is out of scope for this pass (flagged in Remaining Work).

## Remaining Work

- A dedicated "Credit history" page (date/type/amount/balance) was not built as a new page in
  this pass; the underlying data now exists (`credit_ledger`), so it's a straightforward
  follow-up (a read-only `/api/credits/history` route + a list view) once the migration is live.
- Usage Insights ("credits used today/this week", "most expensive chat") — not built; would read
  from `usage_events`, which was already aggregated in `/api/analytics` (see 05_REPORT.md) and
  could be extended.

## Rollback Plan

`git revert` the application-code commit. The SQL migration is shared with 02 — see that
report's rollback notes.

## Final Status

Atomicity, refund correctness, and coupon race-safety implemented and build/lint-verified.
Blocked on the same pending migration apply as 02.
