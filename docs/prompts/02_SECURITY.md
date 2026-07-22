# MICRO MANUS - COMPLETE SECURITY HARDENING

You are a Principal Security Engineer from Stripe, OpenAI, Supabase, and Vercel.

You are modifying an EXISTING production application called MicroManus.

DO NOT:

- Rewrite the architecture.
- Replace Supabase.
- Replace Stripe.
- Add unnecessary dependencies.
- Introduce breaking changes.
- Remove existing functionality.

Your objective is to transform MicroManus into a production-grade secure application.

------------------------------------------------

CURRENT SECURITY ISSUES

1. Users can update:
   - credits
   - has_paid
   - coupon_used

2. Users can potentially:
   - bypass paywall
   - grant themselves credits
   - unlock premium access

3. model_configs exposes:
   - api_key_encrypted

4. Debug logs expose:
   - user object
   - profile object
   - API errors
   - provider responses

5. Stack traces may reach UI.

6. Origin header used in billing.

7. No startup env validation.

8. Service role boundaries need verification.

9. No audit trail for sensitive actions.

10. API routes inconsistently validate input.

------------------------------------------------

FILES TO REVIEW

- supabase/migrations/0001_init.sql
- src/lib/supabase/admin.ts
- src/lib/supabase/server.ts
- src/app/api/chat/route.ts
- src/app/api/billing/*
- src/app/api/model-configs/*
- src/lib/utils.ts
- src/lib/agent/*
- src/lib/stripe.ts
- src/app/api/*
- middleware.ts
- proxy.ts

------------------------------------------------

OBJECTIVES

Fix ALL security concerns.

1. RLS Policies.
2. Sensitive column exposure.
3. Logging.
4. API validation.
5. Error handling.
6. Environment validation.
7. Service role access.
8. Secret handling.
9. Stripe security.
10. OAuth security.
11. SSE security.
12. PDF security.
13. Analytics security.
14. Model configuration security.

------------------------------------------------

SUPABASE HARDENING

Verify:

- profiles
- messages
- chats
- reports
- usage_events
- payments
- model_configs
- api_requests

Ensure:

1.

Users CANNOT:

- modify credits
- modify has_paid
- modify coupon_used

2.

Users CAN:

- update avatar
- update name

3.

Service role ONLY:

- credits
- payments
- coupon updates
- report generation

------------------------------------------------

MODEL CONFIG SECURITY

Verify:

1.

Users NEVER receive:

- api_key_encrypted
- raw API keys

2.

Users ONLY receive:

- masked values

Example:

sk-****1234

------------------------------------------------

LOGGING POLICY

REMOVE:

console.log
console.dir
console.error with secrets

Implement:

- structured logs
- request ids
- trace ids

SAFE EXAMPLE

{
    requestId,
    route,
    duration,
    status
}

------------------------------------------------

ERROR HANDLING

Ensure:

Users NEVER see:

- stack traces
- SQL errors
- Stripe errors
- OpenAI errors
- Supabase errors

Users SHOULD see:

- Please sign in.
- Billing unavailable.
- Rate limit exceeded.
- Provider unavailable.
- Something went wrong.

------------------------------------------------

STRIPE SECURITY

Verify:

- webhook signatures
- idempotency
- session validation
- replay protection
- redirect URLs

Ensure:

- NEXT_PUBLIC_SITE_URL
- no Origin header usage

------------------------------------------------

ENVIRONMENT VALIDATION

Verify:

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- BRAVE_API_KEY
- ENCRYPTION_KEY

Application MUST:

- fail fast
- provide readable startup errors

------------------------------------------------

WOW FACTORS

Implement:

1.

Security dashboard.

Show:

- active model
- provider
- OAuth providers connected
- account status
- payment status

2.

Security indicators.

- Encrypted
- Verified
- Protected

3.

Settings page badges.

------------------------------------------------

TEST CASES

1.

Attempt:

UPDATE profiles
SET credits=999;

Expected:

- denied

---------------------------------------

Attempt:

SELECT api_key_encrypted

Expected:

- denied

---------------------------------------

Attempt:

Replay webhook.

Expected:

- ignored

---------------------------------------

Attempt:

Missing env variable.

Expected:

- startup failure

---------------------------------------

Attempt:

Provider exception.

Expected:

- user-friendly error

------------------------------------------------

VERIFY

- No secrets leaked.
- No PII exposed.
- No RLS bypass.
- No credit bypass.
- No OAuth issues.
- No Stripe vulnerabilities.
- No API key exposure.
- No stack traces.

------------------------------------------------

RETURN

1. Root cause.
2. Security findings.
3. Files modified.
4. Complete replacement code.
5. Migration changes.
6. Risks.
7. Rollback plan.
8. Verification steps.
9. Security checklist.
10. Production readiness score.

DO NOT STOP UNTIL ALL SECURITY ISSUES ARE RESOLVED.