# Deploy Checklist

Use this before considering a deployment production-ready. Check every box — do not skip
items because they "probably work."

## OAuth setup

- [ ] Google OAuth app created in [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
      authorized redirect URI set to `https://<project-ref>.supabase.co/auth/v1/callback`.
- [ ] GitHub OAuth App created at [github.com/settings/developers](https://github.com/settings/developers),
      same callback URL.
- [ ] Both providers enabled under Supabase **Authentication → Providers**.
- [ ] Production URL added to Supabase **Authentication → URL Configuration → Redirect URLs**.
- [ ] `NEXT_PUBLIC_SITE_URL` set to the production URL (checked by
      `checkOAuthRedirectConfig()` — missing this silently breaks OAuth in production, falling
      back to `localhost`).
- [ ] Manually signed in with both Google and GitHub against the deployed URL at least once.

## Stripe

- [ ] `STRIPE_SECRET_KEY` set to a real (test or live) secret key.
- [ ] Webhook endpoint created in Stripe Dashboard: `https://<domain>/api/billing/webhook`,
      subscribed to `checkout.session.completed`.
- [ ] `STRIPE_WEBHOOK_SECRET` set to that endpoint's signing secret.
- [ ] Verified the webhook actually fires and grants credits (Stripe Dashboard → Webhooks →
      "Send test webhook", or a real test-card checkout).
- [ ] Confirmed `/api/billing/confirm` fallback also grants credits correctly if the webhook
      is temporarily unavailable (both paths are guarded by the same unique
      `payments.stripe_session_id` constraint so neither can double-credit).

## Vercel

- [ ] Project imported, Next.js framework preset auto-detected.
- [ ] All environment variables from [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
      added under **Settings → Environment Variables** (Production **and** Preview, if you
      test on preview deployments).
- [ ] Confirmed the deployment's plan supports the `/api/chat` route's `maxDuration = 120`
      (Pro or Fluid Compute) — or explicitly lowered it to 60 for Hobby and accepted the
      tradeoff (see [DEPLOYMENT.md](./DEPLOYMENT.md#6-function-duration-chat-streaming)).
- [ ] Visited `/status` on the deployed URL and confirmed every check is `healthy` (not
      `degraded` or `unavailable`).

## Supabase

- [ ] `0001_init.sql` applied.
- [ ] `0002_security_and_credits.sql` applied — **required for credits/coupons/payments to
      function at all**. As of the last audit, this is the single most commonly re-flagged
      blocker in this project's history (see every report since Prompt 02).
- [ ] `0003_model_providers.sql` applied — required to save a model config for google/xai/
      openrouter/groq providers (without it, the `model_configs.provider` check constraint
      rejects them).
- [ ] `0004_report_sharing.sql` applied — required for the Share Research feature
      (`reports.share_token` column).
- [ ] RLS confirmed enabled on every table (it's part of `0001_init.sql`, but verify in the
      Supabase dashboard **Authentication → Policies** after applying migrations).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set **only** as a server-side environment variable
      (never `NEXT_PUBLIC_*`) — this key bypasses RLS entirely.

## Environment variables

- [ ] Every variable in [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) is set, with
      real (non-placeholder) values. `getEnvStatus()` / `/status` flags placeholder-looking
      values (containing `placeholder`, `your-`, `xxx`, `changeme`) as not-configured.
- [ ] `ENCRYPTION_KEY` is a long, random, production-only secret — different from any value
      used in development — since it encrypts every user's model API key at rest.

## Webhook validation

- [ ] Confirmed `stripe.webhooks.constructEvent(body, signature, secret)` in
      `src/app/api/billing/webhook/route.ts` rejects requests with a missing/invalid
      signature (test with a curl request without the `Stripe-Signature` header — should get
      a 400, never a credit grant).
- [ ] Confirmed a duplicate/replayed webhook event does not double-grant credits (the
      `grant_payment_credits` RPC is guarded by a unique constraint on
      `payments.stripe_session_id`).

## Final sign-off

- [ ] `npm run build` passes with zero errors.
- [ ] `npm run lint` passes with zero errors.
- [ ] `npm run test` passes with zero failures.
- [ ] Full founder journey (landing → OAuth login → paywall → model config → research →
      report → PDF export → analytics → logout) walked through manually on the deployed URL.

If any box above is unchecked, treat the deployment as **staging, not production**.
