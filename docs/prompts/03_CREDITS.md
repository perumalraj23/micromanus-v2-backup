# MICRO MANUS - COMPLETE CREDIT SYSTEM HARDENING

You are a Principal Engineer from Stripe, Supabase, and OpenAI.

You are modifying an EXISTING production application called MicroManus.

DO NOT:

- Rewrite the architecture.
- Replace Supabase.
- Add unnecessary dependencies.
- Break existing functionality.
- Change existing UX unless improving it.

Your objective is to transform the MicroManus credit system into a production-grade billing and usage platform.

------------------------------------------------

CURRENT ISSUES

1. Credits are decremented using:

credits = profile.credits - 1

2. Refund uses stale values.

3. Credit decrement is NOT atomic.

4. Multiple tabs may consume credits simultaneously.

5. SSE failures may consume credits.

6. Client aborts may consume credits.

7. Empty responses still consume credits.

8. Coupon redemption is raceable.

9. Double payment may grant credits twice.

10. Sidebar credit count becomes stale.

11. No transaction history.

12. No audit trail.

13. No usage reconciliation.

14. No idempotency.

------------------------------------------------

FILES TO REVIEW

- src/app/api/chat/route.ts
- src/app/api/billing/*
- src/app/api/coupon/*
- src/components/sidebar/*
- src/hooks/*
- src/lib/*
- supabase/migrations/*
- src/app/paywall/*
- src/app/analytics/*
- src/components/paywall/*

------------------------------------------------

OBJECTIVES

Fix ALL credit-related issues.

1. Atomic decrement.
2. Atomic refund.
3. Payment integration.
4. Coupon redemption.
5. Abort handling.
6. Empty responses.
7. Sidebar synchronization.
8. Analytics integration.
9. Audit history.
10. Real-time updates.
11. Race conditions.
12. Idempotency.
13. Transaction logging.
14. Credit reconciliation.

------------------------------------------------

ATOMICITY

Ensure:

BAD:

credits = credits - 1

GOOD:

UPDATE profiles
SET credits = credits - 1
WHERE id = ?
AND credits > 0
RETURNING credits;

------------------------------------------------

REFUNDS

Refund credits when:

- Agent fails.
- Provider timeout.
- SSE disconnect.
- Client abort.
- Empty response.
- Max iteration exceeded.
- Tool execution fails.

DO NOT refund when:

- Valid response generated.
- Report generated successfully.

------------------------------------------------

PAYMENTS

Verify:

- Stripe webhook.
- Stripe confirm route.
- Sandbox flow.
- Duplicate requests.
- Replay attacks.

Credits MUST only be granted ONCE.

------------------------------------------------

COUPONS

Verify:

Coupon:

SID_DRDROID

Ensure:

- One-time usage.
- Race-safe.
- Transactional.
- Auditable.

------------------------------------------------

WOW FACTORS

Implement:

1. Credit history page.

Show:

- Date
- Type
- Amount
- Remaining balance
- Description

Example:

+5  Coupon Applied
-1  Research Query
+5  Stripe Payment
-1  PDF Generated

------------------------------------------------

2. Sidebar Widget

Show:

Credits Remaining

Example:

--------------------------------
Credits Remaining

███████░░░ 7 / 10

Low balance.
--------------------------------

------------------------------------------------

3. Usage Insights

Show:

- Credits used today
- Credits used this week
- Most expensive chat
- Average cost
- Average tokens

------------------------------------------------

4. Transaction Timeline

Show:

- Coupon redeemed
- Payment completed
- Research completed
- Refund issued

------------------------------------------------

TEST CASES

1.

Credits = 1

Open:

- Tab A
- Tab B

Send:

2 requests simultaneously.

Expected:

- Only one succeeds.

------------------------------------------------

2.

Credits = 0

Expected:

- NO_CREDITS

------------------------------------------------

3.

Abort request midway.

Expected:

- Refund issued.

------------------------------------------------

4.

Provider timeout.

Expected:

- Refund issued.

------------------------------------------------

5.

Stripe webhook replay.

Expected:

- No duplicate credits.

------------------------------------------------

6.

Apply coupon twice.

Expected:

- Second attempt rejected.

------------------------------------------------

7.

Generate empty response.

Expected:

- Credit refunded.

------------------------------------------------

VERIFY

- No double spending.
- No race conditions.
- No stale balances.
- No duplicate payments.
- No duplicate coupons.
- No lost credits.
- No phantom refunds.

------------------------------------------------

RETURN

1. Root cause.
2. Files modified.
3. Complete replacement code.
4. Migration changes.
5. Risks.
6. Rollback plan.
7. Test cases.
8. Performance impact.
9. Production checklist.
10. Credit system readiness score.

DO NOT STOP UNTIL THE CREDIT SYSTEM IS FULLY PRODUCTION READY.