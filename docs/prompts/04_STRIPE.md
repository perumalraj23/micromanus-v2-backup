# MICRO MANUS - COMPLETE STRIPE & BILLING PLATFORM IMPLEMENTATION

You are a Principal Engineer from Stripe, Vercel, and Supabase.

You are modifying an EXISTING production application called MicroManus.

DO NOT:

- Rewrite the architecture.
- Replace Stripe.
- Replace Supabase.
- Introduce unnecessary dependencies.
- Break existing functionality.
- Change the database schema unless absolutely necessary.

Your objective is to transform MicroManus into a production-grade SaaS billing platform.

------------------------------------------------

CURRENT ISSUES

1. Checkout occasionally returns 500.

2. Error shown:

"We couldn't start the checkout."

3. Billing flow lacks:

- retries
- trace ids
- observability

4. Webhook may double-credit.

5. No billing history.

6. No invoice history.

7. No payment analytics.

8. No payment dashboard.

9. No support for future plans.

10. Success and cancel pages are basic.

11. Checkout uses assumptions.

12. No environment validation.

13. No startup validation.

14. No billing audit trail.

------------------------------------------------

FILES TO REVIEW

- src/app/api/billing/*
- src/lib/stripe.ts
- src/app/paywall/*
- src/app/settings/*
- src/components/*
- src/lib/*
- supabase/migrations/*
- README.md
- .env.example

------------------------------------------------

OBJECTIVES

Fix ALL Stripe-related issues.

1. Checkout.
2. Webhooks.
3. Payment confirmation.
4. Payment retries.
5. Billing history.
6. Sandbox flow.
7. Production flow.
8. Payment analytics.
9. Error handling.
10. Idempotency.
11. Audit trail.
12. Environment validation.
13. Deployment readiness.

------------------------------------------------

CHECKOUT FLOW

Verify:

User

↓

Paywall

↓

Stripe Checkout

↓

Success Page

↓

Webhook

↓

Credits Granted

↓

Analytics Updated

↓

Billing History Updated

------------------------------------------------

VERIFY

- Checkout never returns raw 500.
- Friendly errors only.
- Trace IDs generated.
- Logs are structured.
- Session IDs tracked.

------------------------------------------------

WEBHOOKS

Ensure:

- Signature validation.
- Replay protection.
- Idempotency.
- Duplicate prevention.

Credits MUST be granted exactly once.

------------------------------------------------

PAYMENT PACKS

Support:

1.

Starter

- 5 Credits
- $5

2.

Professional

- 25 Credits
- $20

3.

Power User

- 100 Credits
- $50

Implement architecture that supports future expansion without breaking existing functionality.

------------------------------------------------

WOW FACTORS

IMPLEMENT:

1. Billing Dashboard

Show:

--------------------------------

Current Balance

7 Credits

Total Payments

$25

Total Research Sessions

18

Average Cost

$0.0004

--------------------------------

------------------------------------------------

2. Payment History

Columns:

- Date
- Amount
- Credits
- Status
- Payment ID

------------------------------------------------

3. Billing Timeline

Examples:

- Payment Initiated
- Payment Completed
- Credits Granted
- Coupon Applied
- Refund Issued

------------------------------------------------

4. Usage Summary

Show:

- Credits Purchased
- Credits Used
- Credits Remaining
- Lifetime Spend

------------------------------------------------

5. Billing Badges

Examples:

- Sandbox User
- Paid User
- Power User

------------------------------------------------

SUCCESS PAGE

Improve:

Current:

"Payment successful."

Implement:

--------------------------------

Payment Successful

+5 Credits Added

Transaction ID:
STRIPE_XXXXX

Current Balance:
12 Credits

Continue Researching

--------------------------------

------------------------------------------------

CANCEL PAGE

Implement:

--------------------------------

Payment Cancelled

No money was charged.

Would you like to:

- Try Again
- Apply Coupon
- Contact Support

--------------------------------

------------------------------------------------

ENVIRONMENT VALIDATION

Verify:

- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- NEXT_PUBLIC_SITE_URL

Application should fail gracefully.

------------------------------------------------

ANALYTICS

Track:

- Total Revenue
- Daily Revenue
- Monthly Revenue
- Credits Sold
- Average Payment
- Most Popular Plan

------------------------------------------------

TEST CASES

1.

Missing env variables.

Expected:

- Friendly error.

------------------------------------------------

2.

Webhook replay.

Expected:

- Ignored.

------------------------------------------------

3.

Duplicate payment.

Expected:

- Credits granted once.

------------------------------------------------

4.

Cancel payment.

Expected:

- No credits added.

------------------------------------------------

5.

Successful payment.

Expected:

- Credits added.
- Analytics updated.
- Payment history updated.

------------------------------------------------

6.

Network failure.

Expected:

- Retry possible.

------------------------------------------------

VERIFY

- No double credits.
- No lost payments.
- No 500 errors.
- No replay attacks.
- No leaked Stripe errors.

------------------------------------------------

RETURN

1. Root cause.
2. Files modified.
3. Complete replacement code.
4. Migration changes.
5. Risks.
6. Rollback plan.
7. Test cases.
8. Deployment checklist.
9. Billing readiness score.
10. Assignment readiness score.

DO NOT STOP UNTIL THE BILLING PLATFORM IS FULLY PRODUCTION READY.