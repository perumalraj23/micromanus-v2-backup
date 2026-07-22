-- Performance indexes for MicroManus.
-- Additive only — no schema/behavior changes, safe to run any time after 0001_init.sql.
-- NOT YET APPLIED to the live database in this environment (same as 0002/0003/0004 — see
-- docs/DEPLOY_CHECKLIST.md). Every index here targets a column combination actually used in a
-- WHERE/ORDER BY clause somewhere in src/app/api/**, verified by reading the route source
-- before adding — not speculative.

-- messages: fetched by chat_id, ordered by created_at, in both the agent's history read
-- (src/app/api/chat/route.ts) and the UI's message list (src/app/api/chats/[id]/messages/route.ts).
create index if not exists messages_chat_id_created_at_idx
  on public.messages (chat_id, created_at);

-- chats: listed per-user, ordered by updated_at (src/app/api/chats/route.ts), and looked up by
-- (id, user_id) as an ownership check on nearly every chat-scoped route.
create index if not exists chats_user_id_updated_at_idx
  on public.chats (user_id, updated_at desc);

-- reports: listed per-user ordered by created_at (src/app/api/reports/route.ts), and looked up
-- by chat_id (src/app/api/analytics/route.ts, src/app/api/chats/[id]/messages/route.ts) and by
-- share_token (src/app/share/[token]/page.tsx, once 0004_report_sharing.sql is applied).
create index if not exists reports_user_id_created_at_idx
  on public.reports (user_id, created_at desc);
create index if not exists reports_chat_id_idx
  on public.reports (chat_id);

-- usage_events: the single largest/fastest-growing table, fully scanned per-user on every
-- Analytics page load (src/app/api/analytics/route.ts) and per-model on Settings
-- (src/app/api/model-configs/route.ts). Composite index supports both access patterns.
create index if not exists usage_events_user_id_created_at_idx
  on public.usage_events (user_id, created_at desc);
create index if not exists usage_events_user_id_model_idx
  on public.usage_events (user_id, model);

-- model_configs: looked up per-user on Settings load and on every /api/chat request
-- (getActiveModelConfig in src/lib/agent/config.ts).
create index if not exists model_configs_user_id_idx
  on public.model_configs (user_id);

-- payments: billing history, ordered by created_at (src/app/api/billing/history/route.ts).
create index if not exists payments_user_id_created_at_idx
  on public.payments (user_id, created_at desc);
