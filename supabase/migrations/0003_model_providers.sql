-- Widens the model_configs.provider check constraint to support the additional providers
-- surfaced in the Prompt 07 Model Management UI (Google, xAI, OpenRouter, Groq). Purely
-- additive — does not touch existing rows or any other constraint/policy.
--
-- NOTE: like 0002_security_and_credits.sql, this migration has NOT been applied to the live
-- Supabase database by this agent (no DB/psql/Supabase CLI credentials in this environment).
-- Must be applied manually (Supabase SQL editor or `supabase db push`) before configs using
-- the new provider values can be saved.

alter table public.model_configs drop constraint if exists model_configs_provider_check;

alter table public.model_configs
  add constraint model_configs_provider_check
  check (provider in ('openai', 'anthropic', 'kimi', 'google', 'xai', 'openrouter', 'groq', 'custom'));
