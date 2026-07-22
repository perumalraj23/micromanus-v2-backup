# Architecture

MicroManus is a single Next.js 16 (App Router) application. There is no separate backend —
every "server" concern (auth, database access, LLM calls, Stripe, PDF rendering) is a Next.js
Route Handler under `src/app/api/**`, running in the Node.js runtime.

## System overview

```mermaid
flowchart TB
    subgraph Client["Browser"]
        UI["React 19 UI\n(src/components, src/app/(app))"]
    end

    subgraph Server["Next.js App Router (src/app)"]
        Proxy["proxy.ts / middleware\n(session refresh + route guard)"]
        API["API Route Handlers\n(src/app/api/**)"]
        Agent["Agent loop\n(src/lib/agent/loop.ts)"]
    end

    Supabase[("Supabase\nPostgres + Auth + RLS")]
    Stripe[("Stripe\nsandbox Checkout + Webhooks")]
    Brave[("Brave Search API")]
    LLM[("Any OpenAI-compatible\nmodel provider")]

    UI -- "REST + SSE" --> Proxy --> API
    API -- "auth.getUser() / RLS reads" --> Supabase
    API -- "service-role writes\n(credits, chats, reports)" --> Supabase
    API -- "checkout / webhook" --> Stripe
    Agent -- "web_search tool" --> Brave
    Agent -- "chat.completions" --> LLM
    API --> Agent
```

## Key modules

| Concern | Location |
|---|---|
| Route guard / session refresh | [src/proxy.ts](../src/proxy.ts), [src/lib/supabase/middleware.ts](../src/lib/supabase/middleware.ts) |
| Supabase clients | [src/lib/supabase/client.ts](../src/lib/supabase/client.ts) (browser), [server.ts](../src/lib/supabase/server.ts) (RLS-scoped), [admin.ts](../src/lib/supabase/admin.ts) (service-role, bypasses RLS) |
| Agent loop | [src/lib/agent/loop.ts](../src/lib/agent/loop.ts) |
| Agent system prompt & tool schemas | [src/lib/agent/prompt.ts](../src/lib/agent/prompt.ts) |
| Web search tool | [src/lib/agent/brave-search.ts](../src/lib/agent/brave-search.ts) |
| Active model resolution (decrypts key) | [src/lib/agent/config.ts](../src/lib/agent/config.ts) |
| API key encryption at rest | [src/lib/crypto.ts](../src/lib/crypto.ts) |
| Cost/cache estimation | [src/lib/pricing.ts](../src/lib/pricing.ts) |
| Stripe packs/client | [src/lib/stripe.ts](../src/lib/stripe.ts) |
| Rate limiting | [src/lib/rate-limit.ts](../src/lib/rate-limit.ts) |
| Structured logging / metrics / health | [src/lib/logger.ts](../src/lib/logger.ts), [src/lib/metrics.ts](../src/lib/metrics.ts), [src/lib/health.ts](../src/lib/health.ts) |
| PDF rendering | [src/lib/pdf/report.tsx](../src/lib/pdf/report.tsx) |
| Database schema | [supabase/migrations/0001_init.sql](../supabase/migrations/0001_init.sql) (+ `0002`/`0003`/`0004`, **not yet applied to the live DB** — see [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md)) |

## Diagram: Authentication flow

Google/GitHub OAuth via Supabase Auth. `proxy.ts` (Next.js middleware) refreshes the session
cookie on every request and redirects unauthenticated users to `/login`.

```mermaid
sequenceDiagram
    participant U as User (browser)
    participant N as Next.js (proxy.ts / /auth/callback)
    participant S as Supabase Auth
    participant P as Google/GitHub

    U->>N: GET /login, click "Sign in with Google/GitHub"
    N->>S: supabase.auth.signInWithOAuth({ provider })
    S->>P: redirect to provider consent screen
    P->>S: redirect back with auth code
    S->>N: redirect to /auth/callback?code=...
    N->>S: exchangeCodeForSession(code)
    S-->>N: session cookie set
    N-->>U: redirect to /chat (or /auth/auth-code-error on failure)

    Note over N: Every subsequent request: proxy.ts calls<br/>supabase.auth.getUser() to refresh the<br/>session cookie and gate protected routes.
```

## Diagram: Agent loop (Think → Tool Call → Observe)

```mermaid
flowchart TD
    Start(["POST /api/chat"]) --> Init["runAgentLoop()\niteration = 0..5"]
    Init --> Think["Think:\nchat.completions.create()\nwith tools=[web_search, generate_report]"]
    Think --> Decide{Tool calls\nreturned?}
    Decide -- "no, has content" --> Stream["Stream final answer\ntoken by token (SSE)"]
    Decide -- "no, empty" --> Empty["emit 'empty' event"]
    Decide -- "yes: web_search" --> Search["braveSearch(query)\n(retries 429/5xx/network up to 3x)"]
    Search --> Observe1["Push tool result into\nconversation, loop again"]
    Decide -- "yes: generate_report" --> Report["Build ReportSummary,\nemit 'report' event"]
    Report --> Observe2["Push tool ack into\nconversation, loop again"]
    Observe1 --> Think
    Observe2 --> Think
    Stream --> Done(["emit 'done' with token usage"])
    Think -. "6 iterations reached" .-> Incomplete["emit 'done' incomplete=true"]
```

## Diagram: Credit flow

```mermaid
flowchart LR
    A["User sends a message\n(POST /api/chat)"] --> B{"profile.has_paid\n&& credits > 0?"}
    B -- "no" --> C["402 NO_CREDITS"]
    B -- "yes" --> D["admin.rpc('decrement_credit')\n(atomic, race-safe)"]
    D --> E["Run agent loop"]
    E -- "success" --> F["Credit stays spent"]
    E -- "error before output" --> G["admin.rpc('refund_credit')\n(refundOnce guard)"]
```

`decrement_credit`/`refund_credit` are SQL functions defined in
`supabase/migrations/0002_security_and_credits.sql` — **not yet applied to the live database**
in this environment (see [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md)).

## Diagram: Stripe flow

```mermaid
sequenceDiagram
    participant U as User
    participant N as Next.js (/api/billing/*)
    participant St as Stripe
    participant DB as Supabase (service role)

    U->>N: POST /api/billing/checkout { packId }
    N->>St: checkout.sessions.create(...)
    St-->>N: session.url
    N-->>U: redirect to Stripe Checkout
    U->>St: pays with test card
    St-->>U: redirect to /paywall?session_id=...
    par Webhook (durable path)
        St->>N: POST /api/billing/webhook (signed event)
        N->>N: stripe.webhooks.constructEvent(body, sig, secret)
        N->>DB: rpc('grant_payment_credits')\nidempotent via unique stripe_session_id
    and Confirm fallback (in case webhook is slow/misconfigured)
        U->>N: GET /api/billing/confirm?session_id=...
        N->>St: sessions.retrieve(session_id)
        N->>DB: rpc('grant_payment_credits')\n(same idempotency guard)
    end
```

## Diagram: Report generation & export flow

```mermaid
flowchart LR
    Loop["Agent loop emits\n'report' event"] --> Save["POST /api/chat stream handler\nsaves reports row + message.report jsonb"]
    Save --> View["Report Card UI\n(src/components/chat/report-card.tsx)"]
    View -- "Export PDF" --> PDF["GET /api/reports/:id/pdf\n(@react-pdf/renderer)"]
    View -- "Share" --> Share["POST /api/reports/:id/share\n(generates share_token)"]
    Share --> Public["GET /share/:token\n(admin client, filtered by\nunguessable token — no public RLS policy)"]
```

## Diagram: SSE (Server-Sent Events) flow

```mermaid
sequenceDiagram
    participant U as Browser (use-agent-stream.ts)
    participant N as POST /api/chat (ReadableStream)
    participant A as runAgentLoop() generator

    U->>N: fetch(POST, body: {chatId, content})
    N->>N: validate, rate-limit, decrement_credit
    N-->>U: 200, Content-Type: text/event-stream
    loop for each agent event
        N->>A: for await (event of runAgentLoop())
        A-->>N: {type: thought|timeline|token|report|done|error}
        N-->>U: event: <type>\ndata: <json>\n\n
    end
    N->>N: persist assistant message + usage_events row
    N-->>U: stream closes
    Note over U,N: On client disconnect mid-stream, the<br/>ReadableStream's cancel() still runs the<br/>refund-on-error path so credits aren't lost.
```

## Screens

No screenshots are committed (see README → Screenshots). Each screen maps to real, runnable
component/page files:

| Screen | File(s) |
|---|---|
| Login | [src/app/login/page.tsx](../src/app/login/page.tsx) |
| Paywall (coupon/Stripe) | [src/app/paywall/page.tsx](../src/app/paywall/page.tsx) |
| Chat (agent loop, live timeline/thoughts) | [src/app/(app)/chat/page.tsx](../src/app/(app)/chat/page.tsx), [src/components/chat/chat-window.tsx](../src/components/chat/chat-window.tsx) |
| Report card / PDF export / share | [src/components/chat/report-card.tsx](../src/components/chat/report-card.tsx) |
| Reports list | [src/app/(app)/reports/page.tsx](../src/app/(app)/reports/page.tsx) |
| Settings (model configs) | [src/app/(app)/settings/page.tsx](../src/app/(app)/settings/page.tsx) |
| Analytics | [src/app/(app)/analytics/page.tsx](../src/app/(app)/analytics/page.tsx) |
| Status / deployment health | [src/app/status/page.tsx](../src/app/status/page.tsx) |

## Security notes

- Model API keys are encrypted at rest with AES-256-GCM ([src/lib/crypto.ts](../src/lib/crypto.ts)); the key is derived from `ENCRYPTION_KEY` via SHA-256, never stored in plaintext.
- Stripe webhook signatures are verified with `stripe.webhooks.constructEvent` — requests without a valid signature are rejected before any database write.
- All mutating routes validate input with Zod and use the service-role client only after confirming the request's user via the RLS-scoped `createClient()` — service-role queries are always additionally filtered by `user_id`.
- Report sharing deliberately uses an unguessable `share_token` filtered via the service-role client rather than a public RLS policy, to avoid accidentally exposing all users' reports through an overly broad `OR`-combined policy.
- Per-user sliding-window rate limiting ([src/lib/rate-limit.ts](../src/lib/rate-limit.ts)) fails open on database errors (availability over strictness for a non-security-critical limiter).
