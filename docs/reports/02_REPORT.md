# Report — 02: Security Hardening

## Metadata

- Prompt: docs/prompts/02_SECURITY.md
- Date: 2026-07-22
- Branch: main
- Commit Hash: (see git log after commit)
- Build Status: PASS (`npm run build`, `npm run lint`)

## Executive Summary

Confirmed and fixed the exact vulnerability class described in the prompt: the `profiles`
table's RLS policy (`"profiles: update own" ... using (auth.uid() = id)`) had no column
restriction, so any authenticated user could call the Supabase REST API directly (with their own
session, bypassing the app entirely) and run `UPDATE profiles SET credits = 999` or
`has_paid = true`. Same class of issue existed for `model_configs.api_key_encrypted`, which was
selectable by its owning user under the "all own" policy. Added a new migration
(`0002_security_and_credits.sql`) that closes both gaps with column-level privilege revocation
plus a defense-in-depth trigger, without touching existing tables/columns. Also removed
PII/secret logging and fixed an Origin-header trust issue in Stripe checkout.

## Files Modified

- `supabase/migrations/0002_security_and_credits.sql` (new) — see Supabase Hardening below.
- `src/lib/supabase/client.ts` — removed `console.log` of the Supabase URL/anon key on every
  browser client construction (was also printed during `next build`'s static generation).
- `src/lib/env.ts` (new) — central env-var status check (`getEnvStatus()`), used by the health
  check in 06_REPORT.md; never throws, so a missing var can't crash the whole app at import time.
- `src/app/api/model-configs/route.ts` — `GET` now reads via the service-role admin client
  (scoped with `.eq("user_id", user.id)`) instead of the user-scoped client, since the client
  role can no longer `SELECT api_key_encrypted` at all (see migration). Never derives a preview
  from a value it isn't allowed to read as the authenticated role.
- `src/app/api/model-configs/[id]/route.ts` — same rationale for `PATCH`, which also now
  supports editing all fields (label/provider/base_url/model/api_key), not just `set_default`.
- `src/app/api/billing/checkout/route.ts` — stopped trusting the client-controlled `Origin`
  header for the Stripe redirect URLs; now always uses `NEXT_PUBLIC_SITE_URL`.
- `src/app/api/chat/route.ts` — removed `console.log("USER =", user)` /
  `console.log("PROFILE =", profile)` (logged full user/profile objects, including email/name).
- `eslint.config.mjs` — ignore `test.js`, a standalone manual debug script unrelated to the
  Next.js app, so `npm run lint` is clean without deleting the user's scratch file.

## Bugs Fixed / Security Improvements

1. **Credit/paywall bypass via direct Supabase REST calls** — `profiles.credits`,
   `has_paid`, `coupon_used` are now protected by:
   - Column-level privilege revocation (`revoke update on public.profiles from authenticated;
     grant update (full_name, avatar_url) to authenticated;`) — the authenticated Postgres role
     can no longer even attempt to write those columns.
   - A `before update` trigger (`protect_profile_columns`) that silently reverts those three
     columns to their old values unless the request is running as `service_role` — defense in
     depth in case a future policy/grant change reintroduces the gap.
2. **`model_configs.api_key_encrypted` exposure** — `revoke select (api_key_encrypted) on
   public.model_configs from authenticated;`. The column is now unreadable by the client role
   entirely, not just "not returned by the app" — closes the direct-REST-call bypass.
3. **PII/secrets in logs** — removed `console.log` of the Supabase anon key/URL and the full
   `user`/`profile` objects.
4. **Origin header trusted for billing redirects** — checkout now always uses
   `NEXT_PUBLIC_SITE_URL`.
5. **No environment validation** — added `src/lib/env.ts`; wired into the health/deployment
   endpoints added in 06 (see 06_REPORT.md) rather than crashing at import time.
6. **No audit trail for credit/payment mutations** — added `public.credit_ledger` (insert-only,
   RLS: read own), populated by every credit-mutating SQL function (see 03/04 reports).

## Supabase Hardening (checklist from the prompt)

- `profiles`: users can update `full_name`/`avatar_url` only; `credits`/`has_paid`/`coupon_used`
  are column-grant-revoked for `authenticated` and trigger-protected as a second layer.
- `model_configs`: RLS unchanged (still row-scoped to the owner) but `api_key_encrypted` is no
  longer selectable by the client role at all — only the service-role admin client can read it
  (used server-side to decrypt for the agent loop / masked preview).
- `payments`: added a `unique (stripe_session_id)` constraint so the webhook and the sandbox
  confirm-fallback route can never insert two rows for the same Stripe session (see 04_REPORT.md
  for the idempotent `grant_payment_credits` function that relies on it).
- `credit_ledger` (new): insert-only audit trail, readable only by the owning user.
- All mutations to `credits`/`has_paid`/`coupon_used` now go through `security definer` SQL
  functions (`decrement_credit`, `refund_credit`, `redeem_coupon`, `grant_payment_credits`)
  invoked via the service-role admin client — never via a raw `UPDATE` computed from a
  client-supplied or possibly-stale value.

## Test Cases (from the prompt)

| Test | Expected | Result |
|---|---|---|
| `UPDATE profiles SET credits=999` as the owning user (anon/authenticated role) | denied | **Denied** — column privilege revoked; the trigger would also revert it even if the grant were mistakenly restored. Verified by migration SQL review; not exercised against a live DB in this environment (no direct DB/psql access here — see Remaining Work). |
| `SELECT api_key_encrypted` as the owning user | denied | **Denied** — column select privilege revoked. |
| Replay a Stripe webhook | ignored | **Ignored** — `grant_payment_credits` is guarded by the `payments.stripe_session_id` unique constraint (see 04_REPORT.md). |

## Tests Performed

- `npm run build` / `npm run lint` — both pass.
- Manual SQL review of the new migration for syntax and idempotency (`if not exists` /
  `drop ... if exists` guards so it's safe to re-run).
- **Not performed:** applying the migration to the live Supabase project and running the actual
  SQL test cases above. This environment has real Supabase URL/anon/service-role keys in
  `.env.local`, but no `psql`/Supabase CLI/DB password is available here, and applying schema
  changes to a real hosted project is exactly the kind of "modifies shared infrastructure"
  action this assistant should not do without explicit user confirmation. **Action required:**
  run `supabase/migrations/0002_security_and_credits.sql` in the Supabase SQL editor (or
  `supabase db push`) before relying on any of the atomic RPCs added in 03/04.

## Risks

- Until the migration is applied, `src/app/api/chat/route.ts`, the coupon route, and the
  Stripe routes call `admin.rpc("decrement_credit" | "refund_credit" | "redeem_coupon" |
  "grant_payment_credits", ...)`, which will fail with "function does not exist" against the
  current (pre-migration) database. This is a **hard dependency** — the migration must be
  applied for credits/coupons/payments to work at all after this change.
- Revoking `UPDATE` on `profiles` for `authenticated` could break any other client-side code path
  that updates profile columns beyond `full_name`/`avatar_url`. Searched the codebase — no such
  path exists today.

## Remaining Work

- Apply `supabase/migrations/0002_security_and_credits.sql` to the live project (requires
  Supabase dashboard/CLI access with write permission — not available to this session).
- A visible "Security" status section in Settings (encrypted/verified/protected badges) was
  deferred to keep this pass focused on actual vulnerabilities rather than cosmetic additions;
  can be added cheaply once the model-management settings work in 07 lands.

## Rollback Plan

Revert the migration is not automatic (Postgres migrations aren't naturally reversible) — a
follow-up down-migration would `drop trigger`, `grant update on public.profiles to
authenticated`, and `grant select (api_key_encrypted) ...` to restore prior (insecure) behavior.
Application code changes revert cleanly via `git revert`.

## Final Status

Code and migration written and build/lint-verified. **Blocked on the user applying the SQL
migration to the live Supabase project** before the credit/coupon/payment RPCs used starting in
03_REPORT.md will function.
