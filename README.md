# MicroManus

A miniature Manus + Perplexity: a deep-research AI agent with live web search, a visible
Think → Tool Call → Observe reasoning loop, PDF report generation, Stripe-sandbox
credit billing, and a usage/cost analytics dashboard.

Built with Next.js 16 (App Router), Supabase (auth + Postgres), Stripe (sandbox payments),
Brave Search, and the OpenAI SDK (works with any OpenAI-compatible endpoint — OpenAI,
Anthropic/Claude, Moonshot's Kimi, OpenRouter, etc.).

## 1. Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is fine)
- A [Stripe](https://dashboard.stripe.com/register) account in **test mode**
- A [Brave Search API](https://api.search.brave.com/app/keys) key (free tier: 2,000 queries/month)
- At least one model API key: [OpenAI](https://platform.openai.com/api-keys),
  [Anthropic](https://console.anthropic.com/settings/keys), or [Moonshot/Kimi](https://platform.moonshot.ai/)
- A [Vercel](https://vercel.com) account for deployment

## 2. Supabase setup

1. Create a new Supabase project.
2. Open the **SQL Editor** and run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   This creates all tables, the `handle_new_user` trigger (auto-creates a `profiles` row on
   signup), and Row Level Security policies.
3. Go to **Authentication → Providers** and enable:
   - **Google** — create OAuth credentials in the
     [Google Cloud Console](https://console.cloud.google.com/apis/credentials) with redirect
     URI `https://<your-project-ref>.supabase.co/auth/v1/callback`.
   - **GitHub** — create an OAuth App at
     [github.com/settings/developers](https://github.com/settings/developers) with the same
     callback URL.
4. Under **Authentication → URL Configuration**, add your deployed URL (and
   `http://localhost:3000` for local dev) to the Redirect URLs allow-list.
5. Copy your **Project URL**, **anon public key**, and **service_role key** from
   **Project Settings → API** into your environment variables (see step 5).

## 3. Stripe setup (sandbox)

1. In the Stripe Dashboard, switch to **Test mode**.
2. Copy your test **Secret key** into `STRIPE_SECRET_KEY`.
3. Add a webhook endpoint pointing at `https://<your-domain>/api/billing/webhook`, listening
   for `checkout.session.completed`, and copy its **Signing secret** into
   `STRIPE_WEBHOOK_SECRET`.
   - Note: the app also verifies payment directly with Stripe when the user is redirected
     back from Checkout, so credits are still granted correctly even before a webhook is
     configured — the webhook is the durable, production-grade path.
4. Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

## 4. Brave Search

Grab an API key from the [Brave Search API dashboard](https://api.search.brave.com/app/keys)
and set `BRAVE_SEARCH_API_KEY`. This powers the agent's `web_search` tool.

## 5. Environment variables

Copy `.env.example` to `.env.local` and fill in every value:

```bash
cp .env.example .env.local
```

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only, bypasses RLS) |
| `ENCRYPTION_KEY` | Any long random string — encrypts user model API keys at rest |
| `STRIPE_SECRET_KEY` | Stripe test secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `BRAVE_SEARCH_API_KEY` | Brave Search API key |
| `NEXT_PUBLIC_SITE_URL` | Public site URL (used for Stripe redirect URLs) |

## 6. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 7. Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project**, import the repo.
3. Add all the environment variables from step 5 (use your production Supabase/Stripe values).
4. Set `NEXT_PUBLIC_SITE_URL` to your Vercel URL, and add that same URL to Supabase's
   Redirect URLs allow-list and to your Google/GitHub OAuth app's callback settings.
5. Deploy. Then add the Stripe webhook endpoint pointing at
   `https://<your-vercel-domain>/api/billing/webhook`.

The chat API route (`/api/chat`) streams responses and can run for up to two minutes
(`maxDuration = 120`) for long research sessions — this requires a Vercel plan whose
function duration limit supports it (Pro or Fluid Compute); on Hobby, lower `maxDuration`
in [`src/app/api/chat/route.ts`](src/app/api/chat/route.ts) if you hit timeouts.

## 8. First-run product tour

1. Open the deployed URL → **Sign In** with Google or GitHub.
2. You'll land on the **paywall**. Either:
   - Enter coupon `SID_DRDROID`, or
   - Pay $5 via Stripe sandbox Checkout (test card above).
   Both grant **5 credits**.
3. In **Settings**, add a model API key (pick a preset: GPT-4o mini, Claude 3.5 Sonnet, or
   Kimi K2 — or enter a fully custom OpenAI-compatible endpoint).
4. Start a new chat and ask: *"Analyze recent California wildfires and generate a report."*
5. Watch the **Research Timeline** and **Agent Thoughts** update live as it searches the web,
   then review the **Executive Summary** and export it as a **PDF**.
6. Open **Analytics** to see total chats, token usage, cost per model/chat, and cache savings.

## Architecture notes

- **Agent loop** (`src/lib/agent/loop.ts`): a Think → Tool Call → Observe loop against any
  OpenAI-compatible `chat.completions` endpoint, with `web_search` (Brave Search) and
  `generate_report` tools. Streams thoughts, timeline events, and the final answer over
  Server-Sent Events.
- **Credits**: 1 credit is consumed per research query; refunded automatically if the agent
  loop errors before producing output.
- **Security**: model API keys are encrypted at rest (AES-256-GCM) and never returned to the
  client in full; Stripe webhook signatures are verified; all API routes validate input with
  Zod and enforce per-user rate limiting; RLS scopes every table to its owner.
- **Cost & cache accounting**: token usage is read from each provider's response and priced
  against a best-effort public pricing table (`src/lib/pricing.ts`) for estimated cost and
  cache savings — actual billing always happens with your own model provider account.

## Deploy on Vercel

The easiest way to deploy this Next.js app is the [Vercel Platform](https://vercel.com/new).
See the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying)
for more details.

