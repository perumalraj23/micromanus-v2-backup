-- MicroManus — Security hardening & atomic credit operations
-- Run this in the Supabase SQL editor (or via `supabase db push`) AFTER 0001_init.sql.
--
-- This migration is additive and reversible: it does not drop or rename any existing
-- table/column, and only tightens privileges that were never meant to be user-writable.

-- Credit ledger (audit trail) -------------------------------------------------
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null,
  balance_after integer not null,
  reason text not null,
  reference_id text,
  created_at timestamptz not null default now()
);

alter table public.credit_ledger enable row level security;

drop policy if exists "credit_ledger: read own" on public.credit_ledger;
create policy "credit_ledger: read own" on public.credit_ledger for select using (auth.uid() = user_id);

create index if not exists credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);

-- Idempotent Stripe crediting: one payment row per Stripe session ------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payments_stripe_session_id_key'
  ) then
    alter table public.payments
      add constraint payments_stripe_session_id_key unique (stripe_session_id);
  end if;
end $$;

-- Helpful indexes (performance) ------------------------------------------------
create index if not exists usage_events_user_idx on public.usage_events (user_id, created_at desc);
create index if not exists reports_user_idx on public.reports (user_id, created_at desc);
create index if not exists messages_chat_idx on public.messages (chat_id, created_at asc);
create index if not exists chats_user_idx on public.chats (user_id, updated_at desc);

-- Atomic credit decrement (race-safe: fails if credits <= 0) -------------------
create or replace function public.decrement_credit(p_user_id uuid, p_reason text default 'research_query')
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_credits integer;
begin
  update public.profiles
     set credits = credits - 1
   where id = p_user_id
     and credits > 0
  returning credits into v_credits;

  if v_credits is null then
    return null;
  end if;

  insert into public.credit_ledger (user_id, delta, balance_after, reason)
  values (p_user_id, -1, v_credits, p_reason);

  return v_credits;
end;
$$;

-- Atomic credit refund ----------------------------------------------------------
create or replace function public.refund_credit(p_user_id uuid, p_reason text default 'refund')
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_credits integer;
begin
  update public.profiles
     set credits = credits + 1
   where id = p_user_id
  returning credits into v_credits;

  if v_credits is null then
    return null;
  end if;

  insert into public.credit_ledger (user_id, delta, balance_after, reason)
  values (p_user_id, 1, v_credits, p_reason);

  return v_credits;
end;
$$;

-- Atomic, race-safe coupon redemption (one-time use, enforced in SQL) -----------
create or replace function public.redeem_coupon(p_user_id uuid, p_code text, p_credits integer)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_credits integer;
begin
  update public.profiles
     set credits = credits + p_credits,
         has_paid = true,
         coupon_used = p_code
   where id = p_user_id
     and coupon_used is null
  returning credits into v_credits;

  if v_credits is null then
    return null;
  end if;

  insert into public.credit_ledger (user_id, delta, balance_after, reason, reference_id)
  values (p_user_id, p_credits, v_credits, 'coupon_redeemed', p_code);

  return v_credits;
end;
$$;

-- Atomic, idempotent Stripe crediting (unique constraint guards double-credit) --
create or replace function public.grant_payment_credits(
  p_user_id uuid,
  p_session_id text,
  p_credits integer,
  p_amount_usd numeric
)
returns table(credits integer, already_processed boolean)
language plpgsql
security definer set search_path = public
as $$
declare
  v_credits integer;
begin
  begin
    insert into public.payments (user_id, stripe_session_id, amount_usd, credits_added, status)
    values (p_user_id, p_session_id, p_amount_usd, p_credits, 'completed');
  exception when unique_violation then
    select p.credits into v_credits from public.profiles p where p.id = p_user_id;
    return query select v_credits, true;
    return;
  end;

  update public.profiles
     set credits = credits + p_credits,
         has_paid = true
   where id = p_user_id
  returning profiles.credits into v_credits;

  insert into public.credit_ledger (user_id, delta, balance_after, reason, reference_id)
  values (p_user_id, p_credits, v_credits, 'stripe_payment', p_session_id);

  return query select v_credits, false;
end;
$$;

-- Defense in depth: even if a client update slips past column grants, silently
-- revert changes to protected columns unless the request is using the service role. ---
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') is distinct from 'service_role' then
    new.credits := old.credits;
    new.has_paid := old.has_paid;
    new.coupon_used := old.coupon_used;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_columns on public.profiles;
create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute procedure public.protect_profile_columns();

-- Column-level privileges: users can only ever update their own display fields.
-- (Service role bypasses table/column grants entirely, so server routes are unaffected.)
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- Never let the client role select encrypted API keys, even for their own rows.
revoke select (api_key_encrypted) on public.model_configs from authenticated;

-- Note: writes to credits/has_paid/coupon_used/api_key_encrypted must go through the
-- service-role admin client (src/lib/supabase/admin.ts) and the RPC functions above.
