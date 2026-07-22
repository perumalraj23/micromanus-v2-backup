# Deployment

MicroManus deploys as a standard Next.js 16 App Router project. The reference target is
[Vercel](https://vercel.com), which is what the codebase and this guide assume; any Node.js
hosting platform that supports Next.js Route Handlers and streaming responses would also work.

## 1. Push to GitHub

Vercel imports directly from a GitHub (or GitLab/Bitbucket) repository.

## 2. Create the Vercel project

1. In Vercel, **Add New → Project**, import this repo.
2. Framework preset should auto-detect as **Next.js**. No build command changes are needed
   (`next build` / `next start`).

## 3. Environment variables

Add every variable from [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) in the Vercel
project's **Settings → Environment Variables**, using your **production** Supabase/Stripe
values (not the same test values you used locally, if you created separate projects).

Critically, set:

- `NEXT_PUBLIC_SITE_URL` → your production URL (e.g. `https://micromanus.vercel.app` or your
  custom domain). This is used for Stripe Checkout redirect URLs and is checked by
  `checkOAuthRedirectConfig()` in the `/status` health page — if it's missing, OAuth redirects
  silently fall back to `http://localhost:3000` in production, which will break login.

## 4. Supabase production config

1. Add your production URL to **Authentication → URL Configuration → Redirect URLs**.
2. Update your Google/GitHub OAuth app's authorized redirect URI if you're using a separate
   production Supabase project (the redirect URI is always
   `https://<project-ref>.supabase.co/auth/v1/callback`, so this usually only changes if you
   provisioned a new Supabase project for production).
3. Ensure `0001_init.sql` and — **before going live with payments/coupons/sharing** —
   `0002_security_and_credits.sql`, `0003_model_providers.sql`, and
   `0004_report_sharing.sql` have all been run against the production database. See
   [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md).

## 5. Stripe production config

1. Add a webhook endpoint in the Stripe Dashboard pointing at
   `https://<your-domain>/api/billing/webhook`, listening for `checkout.session.completed`.
2. Copy the endpoint's **Signing secret** into `STRIPE_WEBHOOK_SECRET` in Vercel.
3. If you intend to accept real payments (not sandbox), switch the Stripe account out of Test
   mode and use live keys — this is a business decision outside the scope of this repo's
   current "sandbox" design.

## 6. Function duration (chat streaming)

`src/app/api/chat/route.ts` sets `export const maxDuration = 120;` (2 minutes) to allow long
research sessions to finish before Vercel's function timeout. This requires a Vercel plan
whose function duration limit supports 120s (Pro or Fluid Compute). **On the Hobby plan,
the platform limit is 60s** — either upgrade, or lower `maxDuration` in that file to 60 and
accept that very long research sessions may be cut off. This is a known, previously-flagged
partial gap (see [docs/reports/10_REPORT.md](./reports/10_REPORT.md)).

## 7. Deploy

Click **Deploy**. Vercel builds with `next build` and serves with the Next.js runtime.

## 8. Post-deploy verification

- Visit `/status` — confirms database, Stripe, Brave Search, encryption, and OAuth-redirect
  configuration are all healthy (see [src/lib/health.ts](../src/lib/health.ts)).
- Visit `/api/health` for the same checks as JSON.
- Walk through the first-run flow in [SETUP.md](./SETUP.md#10-first-run-walkthrough) against
  the live URL.

## Full pre-launch checklist

See [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md) for the complete, itemized checklist (OAuth,
Stripe, Vercel, Supabase, environment variables, webhook validation) before considering this
production-ready.
