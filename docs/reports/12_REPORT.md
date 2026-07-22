# Prompt 12 — Production Documentation Report

## Metadata

- Prompt: `docs/prompts/12_DOCUMENTATION.md` — Production Documentation.
- Scope: docs only — no application source code changed.
- Goal restated: make MicroManus understandable by a new engineer in under 30 minutes, and
  runnable in under 10.

## Deliverables

| Requested | Delivered | Notes |
|---|---|---|
| Rewrite README | [README.md](../../README.md) | Trimmed the previous version's duplicated setup steps into dedicated docs, added Features/Architecture/Screenshots/API Reference/Testing/Project status sections, kept a concise inline Setup/first-run walkthrough. |
| `docs/ARCHITECTURE.md` | [docs/ARCHITECTURE.md](../ARCHITECTURE.md) | Includes module map, security notes, and a `#screens` section mapping every UI screen to its real component file. |
| `docs/SETUP.md` | [docs/SETUP.md](../SETUP.md) | Step-by-step: Supabase project + all 4 migrations, OAuth apps, Stripe test mode, Brave key, env vars, first run, test suite. |
| `docs/DEPLOYMENT.md` | [docs/DEPLOYMENT.md](../DEPLOYMENT.md) | Vercel-specific deploy steps, function duration caveat, post-deploy verification via `/status`. |
| `docs/TROUBLESHOOTING.md` | [docs/TROUBLESHOOTING.md](../TROUBLESHOOTING.md) | Grounded in real issues hit during this project's development (native binding errors, ESM config loading, migration-dependent failures) — not hypothetical. |
| `docs/API_REFERENCE.md` | [docs/API_REFERENCE.md](../API_REFERENCE.md) | All 24 route handlers documented (method, auth, body, response), verified against actual route source, not assumed. |
| Diagrams: auth / agent loop / credits / Stripe / report / SSE | All 6, as Mermaid diagrams in `docs/ARCHITECTURE.md` | Embedded rather than separate image files — kept in version control as text, always in sync with review. |
| `docs/ENVIRONMENT_VARIABLES.md` | [docs/ENVIRONMENT_VARIABLES.md](../ENVIRONMENT_VARIABLES.md) | Documents the actual variable names used by the code (verified against `src/lib/env.ts` and `.env.example`) — explicitly calls out that the prompt's example names (`SUPABASE_URL`, `OPENAI_API_KEY`, `BRAVE_API_KEY`) don't match this codebase's real names, to avoid an engineer setting an env var the app never reads. Also documents that there's no single `OPENAI_API_KEY` — model keys are per-user, encrypted, DB-stored. |
| `docs/DEPLOY_CHECKLIST.md` | [docs/DEPLOY_CHECKLIST.md](../DEPLOY_CHECKLIST.md) | Checkbox format covering OAuth, Stripe, Vercel, Supabase (including the 3 pending migrations), env vars, webhook validation, final sign-off. |

## Screenshots

Explicitly not included — documented in the README under "Screenshots" with the reasoning:
no live Supabase/Stripe/Brave/LLM credentials exist in this environment to render real
authenticated UI, and fabricating placeholder images would violate this project's
established "never fabricate" discipline (see every prior report since Prompt 05). Instead,
every screen is mapped to its real, runnable component file in
`docs/ARCHITECTURE.md#screens`.

## Verification of facts used in documentation

Before writing, the following were read directly from source (not assumed) to avoid
documenting incorrect behavior:

- All 24 API route handlers (method + auth + validation + response shape).
- `src/lib/env.ts` — actual required/optional environment variable list.
- `.env.example` — confirmed already exists and matches `src/lib/env.ts`.
- `supabase/migrations/0001_init.sql` — full schema + RLS policies.
- `src/lib/agent/loop.ts`, `src/app/api/chat/route.ts` — agent loop + SSE mechanics.
- `src/app/auth/callback/route.ts`, `src/lib/supabase/middleware.ts`, `src/proxy.ts` — auth flow.
- `src/app/api/billing/checkout/route.ts`, `webhook/route.ts` — Stripe flow + idempotency guard.
- `src/lib/stripe.ts`, `src/lib/pricing.ts` — payment packs, coupon code, cost engine.

## Acceptance Criteria Check

- New engineer can run app in under 10 minutes: `docs/SETUP.md` reduces this to
  clone → Supabase project + migrations → OAuth apps → Stripe test key → Brave key → copy
  `.env.example` → `npm install && npm run dev`. The Supabase/OAuth/Stripe account creation
  steps are the actual bottleneck (not code) and are outside this repo's control.
- All deployment steps documented: `docs/DEPLOYMENT.md` + `docs/DEPLOY_CHECKLIST.md`.
- No undocumented environment variables: cross-checked every variable in `src/lib/env.ts`
  against `docs/ENVIRONMENT_VARIABLES.md` — all 8 (4 required, 4 optional) are documented.

## Remaining Issues

Unchanged from prior reports: the three pending Supabase migrations remain unapplied to any
live database in this environment — `docs/DEPLOY_CHECKLIST.md` and `docs/TROUBLESHOOTING.md`
both flag this as the first thing to check for any credit/coupon/payment/sharing issue.
