-- MicroManus initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists pgcrypto;

-- Profiles ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  credits integer not null default 0,
  has_paid boolean not null default false,
  coupon_used text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Model configs (encrypted API keys) -----------------------------------
create table if not exists public.model_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic', 'kimi', 'custom')),
  label text not null,
  base_url text not null,
  api_key_encrypted text not null,
  model text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Chats -----------------------------------------------------------------
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'New research',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Messages ----------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text,
  thoughts jsonb not null default '[]',
  timeline jsonb not null default '[]',
  report jsonb,
  model text,
  provider text,
  created_at timestamptz not null default now()
);

-- Usage events (for analytics / billing) -----------------------------------
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  chat_id uuid references public.chats (id) on delete set null,
  message_id uuid references public.messages (id) on delete set null,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cached_tokens integer not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  cache_savings_usd numeric(12, 6) not null default 0,
  created_at timestamptz not null default now()
);

-- Reports ------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  chat_id uuid not null references public.chats (id) on delete cascade,
  message_id uuid references public.messages (id) on delete cascade,
  title text not null,
  summary jsonb not null,
  created_at timestamptz not null default now()
);

-- Payments -------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  stripe_session_id text,
  amount_usd numeric(10, 2),
  credits_added integer,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Lightweight rate limiting ----------------------------------------------------
create table if not exists public.api_requests (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists api_requests_user_time_idx on public.api_requests (user_id, created_at desc);

-- updated_at maintenance ------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists chats_set_updated_at on public.chats;
create trigger chats_set_updated_at before update on public.chats
  for each row execute procedure public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- Row Level Security ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.model_configs enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.usage_events enable row level security;
alter table public.reports enable row level security;
alter table public.payments enable row level security;
alter table public.api_requests enable row level security;

create policy "profiles: read own" on public.profiles for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id);

create policy "model_configs: all own" on public.model_configs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "chats: all own" on public.chats for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "messages: all own via chat" on public.messages for all
  using (exists (select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.chats c where c.id = chat_id and c.user_id = auth.uid()));

create policy "usage_events: read own" on public.usage_events for select using (auth.uid() = user_id);
create policy "reports: all own" on public.reports for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "payments: read own" on public.payments for select using (auth.uid() = user_id);
create policy "api_requests: read own" on public.api_requests for select using (auth.uid() = user_id);

-- Note: writes from server-side routes use the Supabase service-role key,
-- which bypasses RLS. Client-side reads/writes stay scoped to the owning user.
