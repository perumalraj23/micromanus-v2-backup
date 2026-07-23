# Setup

Goal: a new engineer running MicroManus locally in under 10 minutes.

## 1. Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is fine)
- A [Stripe](https://dashboard.stripe.com/register) account in **test mode**
- A [Tavily Search](https://app.tavily.com/home) API key
- At least one model API key: [OpenAI](https://platform.openai.com/api-keys),
  [Anthropic](https://console.anthropic.com/settings/keys), [Moonshot/Kimi](https://platform.moonshot.ai/),
  or any other OpenAI-compatible provider (see `src/lib/pricing.ts` for the built-in presets).

## 2. Clone & install

```bash
git clone <this-repo>
cd MicroManus
npm install
```

## 3. Supabase project + schema

1. Create a new Supabase project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).
   This creates all core tables (`profiles`, `model_configs`, `chats`, `messages`,
   `usage_events`, `reports`, `payments`, `api_requests`), the `handle_new_user` trigger
   (auto-creates a `profiles` row on signup), and Row Level Security policies scoping every
   table to its owning user.
3. Also run, in order: [`0002_security_and_credits.sql`](../supabase/migrations/0002_security_and_credits.sql)
   (credit ledger + `decrement_credit`/`refund_credit`/`redeem_coupon`/`grant_payment_credits`
   RPCs), [`0003_model_providers.sql`](../supabase/migrations/0003_model_providers.sql) (widens
   the `model_configs.provider` check constraint), and
   [`0004_report_sharing.sql`](../supabase/migrations/0004_report_sharing.sql) (adds
   `reports.share_token`). **These three are required for credits, coupons, payments, and
   report sharing to work** — the app will build and run without them, but those specific
   features will fail at the database layer.
4. Copy your **Project URL**, **anon public key**, and **service_role key** from
   **Project Settings → API**.

## 4. OAuth providers (Google & GitHub)

In Supabase, go to **Authentication → Providers** and enable:

- **Google** — create OAuth credentials in the
  [Google Cloud Console](https://console.cloud.google.com/apis/credentials) with redirect URI
  `https://<your-project-ref>.supabase.co/auth/v1/callback`.
- **GitHub** — create an OAuth App at
  [github.com/settings/developers](https://github.com/settings/developers) with the same
  callback URL.

Under **Authentication → URL Configuration**, add `http://localhost:3000` (and your deployed
URL, later) to the Redirect URLs allow-list.

## 5. Stripe (sandbox/test mode)

1. In the Stripe Dashboard, switch to **Test mode**.
2. Copy the test **Secret key** into `STRIPE_SECRET_KEY`.
3. (Optional locally, required in production) Add a webhook endpoint pointing at
   `https://<your-domain>/api/billing/webhook`, listening for `checkout.session.completed`,
   and copy its **Signing secret** into `STRIPE_WEBHOOK_SECRET`. Locally, the app also verifies
   payment directly with Stripe when the user is redirected back from Checkout
   (`/api/billing/confirm`), so credits are still granted correctly without a webhook — the
   webhook is the durable, production-grade path.
4. Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

## 6. Tavily Search

Grab an API key from the [Tavily dashboard](https://app.tavily.com/home)
and set `TAVILY_API_KEY`. This powers the agent's `web_search` tool.

## 7. Environment variables

```bash
cp .env.example .env.local
```

Fill in every value — see [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for exactly
what each one is and where to get it.

## 8. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 9. Run the test suite

```bash
npm run test    # vitest run
npm run lint
npm run build
```

## 10. First-run walkthrough

1. Sign in with Google or GitHub.
2. On the paywall, enter coupon `SID_DRDROID` or pay $5 via Stripe sandbox Checkout.
3. In **Settings**, add a model API key.
4. Start a new chat and ask a research question — watch the Research Timeline and Agent
   Thoughts stream live, review the generated report, export it as PDF.
5. Open **Analytics** to see usage/cost.

If anything above doesn't work, check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) before
assuming it's a code bug — most local setup issues are a missing/placeholder env var or an
unapplied migration.
