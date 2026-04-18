-- Zentryx Lab — admin dashboard migration
-- Adds: role-based access, block registry mirror, analytics,
-- feature flags, system settings, announcement banner, error events.

-- ────────────────────────────────────────────────────────────────────
-- Role
-- ────────────────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('user', 'staff', 'admin');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists role user_role not null default 'user';

-- Helper: check if the calling user is an admin (or staff). Security-definer
-- so RLS policies on other tables can call it without recursion.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('admin','staff')
       from public.profiles
      where id = auth.uid()),
    false
  );
$$;

-- profiles self-read is kept; add admin-all-read policy so admins see all rows
drop policy if exists "profiles admin all" on public.profiles;
create policy "profiles admin all" on public.profiles for select
  using (public.is_admin());

-- Allow admin updates (plan / role / suspend)
drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update" on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- Suspended flag for the user-suspend admin control
alter table public.profiles
  add column if not exists suspended boolean not null default false;

-- ────────────────────────────────────────────────────────────────────
-- Admin read-all policies on existing tables
-- ────────────────────────────────────────────────────────────────────
drop policy if exists "subs admin read" on public.subscriptions;
create policy "subs admin read" on public.subscriptions for select
  using (public.is_admin());

drop policy if exists "subs admin update" on public.subscriptions;
create policy "subs admin update" on public.subscriptions for update
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "strategies admin read" on public.strategies;
create policy "strategies admin read" on public.strategies for select
  using (public.is_admin());

drop policy if exists "exports admin read" on public.exports;
create policy "exports admin read" on public.exports for select
  using (public.is_admin());

drop policy if exists "listings admin all" on public.marketplace_listings;
create policy "listings admin all" on public.marketplace_listings for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "purchases admin read" on public.purchases;
create policy "purchases admin read" on public.purchases for select
  using (public.is_admin());

drop policy if exists "reviews admin all" on public.reviews;
create policy "reviews admin all" on public.reviews for all
  using (public.is_admin()) with check (public.is_admin());

-- ────────────────────────────────────────────────────────────────────
-- block_registry_overrides  (admin writes; client reads)
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.block_registry_overrides (
  block_id      text primary key,
  force_status  text,           -- "active" | "beta" | "planned" | "disabled"
  force_plan    text,           -- "free" | "pro" | "creator"
  force_hidden  boolean not null default false,
  notes         text,
  updated_by    uuid references auth.users on delete set null,
  updated_at    timestamptz not null default now()
);

drop trigger if exists block_overrides_updated_at on public.block_registry_overrides;
create trigger block_overrides_updated_at before update on public.block_registry_overrides
  for each row execute function public.set_updated_at();

alter table public.block_registry_overrides enable row level security;

-- Everyone reads (gating is data-driven — client checks these)
drop policy if exists "block_overrides read all" on public.block_registry_overrides;
create policy "block_overrides read all"
  on public.block_registry_overrides for select using (true);

drop policy if exists "block_overrides admin write" on public.block_registry_overrides;
create policy "block_overrides admin write"
  on public.block_registry_overrides for all
  using (public.is_admin()) with check (public.is_admin());

-- ────────────────────────────────────────────────────────────────────
-- block_usage_events  (writes from client on node add; admin reads)
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.block_usage_events (
  id          uuid primary key default gen_random_uuid(),
  block_id    text not null,
  user_id     uuid references auth.users on delete set null,
  strategy_id uuid references public.strategies on delete set null,
  event       text not null default 'add',   -- "add" | "remove" | "configure"
  created_at  timestamptz not null default now()
);

create index if not exists block_usage_block_idx on public.block_usage_events(block_id);
create index if not exists block_usage_day_idx on public.block_usage_events(created_at);

alter table public.block_usage_events enable row level security;

drop policy if exists "usage own insert" on public.block_usage_events;
create policy "usage own insert" on public.block_usage_events for insert
  with check (auth.uid() = user_id);

drop policy if exists "usage admin read" on public.block_usage_events;
create policy "usage admin read" on public.block_usage_events for select
  using (public.is_admin());

-- Aggregated read model for the admin heatmap. Refresh nightly.
create or replace view public.block_analytics as
  select
    block_id,
    count(*)::int                                  as usage_count,
    count(distinct user_id)::int                   as unique_users,
    max(created_at)                                as last_used_at
  from public.block_usage_events
  where event = 'add'
  group by block_id;

-- ────────────────────────────────────────────────────────────────────
-- feature_flags  (global toggles; admin writes, client reads)
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.feature_flags (
  slug        text primary key,
  enabled     boolean not null default false,
  description text,
  updated_by  uuid references auth.users on delete set null,
  updated_at  timestamptz not null default now()
);

drop trigger if exists feature_flags_updated_at on public.feature_flags;
create trigger feature_flags_updated_at before update on public.feature_flags
  for each row execute function public.set_updated_at();

alter table public.feature_flags enable row level security;

drop policy if exists "flags read all" on public.feature_flags;
create policy "flags read all" on public.feature_flags for select using (true);

drop policy if exists "flags admin write" on public.feature_flags;
create policy "flags admin write" on public.feature_flags for all
  using (public.is_admin()) with check (public.is_admin());

-- Seed the well-known flags listed in lib/blocks/flags.ts
insert into public.feature_flags(slug, description, enabled) values
  ('beta.smc', 'Smart-Money Concepts blocks', false),
  ('beta.divergence', 'RSI / MACD divergence detectors', false),
  ('beta.mtf', 'Multi-Timeframe advanced blocks', false),
  ('beta.grid', 'Advanced grid / recovery blocks', false),
  ('beta.protection', 'Beta protection modules (license-key etc.)', false)
on conflict (slug) do nothing;

-- ────────────────────────────────────────────────────────────────────
-- system_settings  (single-row key/value store)
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.system_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_by  uuid references auth.users on delete set null,
  updated_at  timestamptz not null default now()
);

drop trigger if exists system_settings_updated_at on public.system_settings;
create trigger system_settings_updated_at before update on public.system_settings
  for each row execute function public.set_updated_at();

alter table public.system_settings enable row level security;

drop policy if exists "settings read all" on public.system_settings;
create policy "settings read all" on public.system_settings for select using (true);

drop policy if exists "settings admin write" on public.system_settings;
create policy "settings admin write" on public.system_settings for all
  using (public.is_admin()) with check (public.is_admin());

insert into public.system_settings(key, value) values
  ('maintenance',        '{"enabled": false, "message": ""}'::jsonb),
  ('announcement',       '{"enabled": false, "body": "", "tone": "info"}'::jsonb),
  ('pricing',            '{"free": 0, "pro": 29, "creator": 79}'::jsonb),
  ('licensing_defaults', '{"grace_mode": true, "server": "https://license.zentryx.lab/v1/check"}'::jsonb)
on conflict (key) do nothing;

-- ────────────────────────────────────────────────────────────────────
-- system_errors  (client-reported error events for the overview)
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.system_errors (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete set null,
  level       text not null default 'error',     -- error | warn | info
  source      text,                               -- builder | export | compiler | marketplace | api
  message     text not null,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists system_errors_created_idx on public.system_errors(created_at desc);

alter table public.system_errors enable row level security;

drop policy if exists "errors self insert" on public.system_errors;
create policy "errors self insert" on public.system_errors for insert
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists "errors admin read" on public.system_errors;
create policy "errors admin read" on public.system_errors for select
  using (public.is_admin());

-- ────────────────────────────────────────────────────────────────────
-- MRR read model  (admin overview)
-- Summed from subscriptions. Kept as a view — can be materialised later.
-- ────────────────────────────────────────────────────────────────────
create or replace view public.mrr_snapshot as
  select
    count(*) filter (where status in ('active','trialing')) as paying_subscribers,
    count(*) filter (where plan = 'pro' and status in ('active','trialing')) as pro_subs,
    count(*) filter (where plan = 'creator' and status in ('active','trialing')) as creator_subs,
    sum(case
          when status not in ('active','trialing') then 0
          when plan = 'pro' then 29
          when plan = 'creator' then 79
          else 0
        end) as mrr_usd
  from public.subscriptions;

-- Comment: views inherit the caller's RLS on underlying tables, so admins
-- (with the read-all policy on subscriptions) can SELECT the view.

-- ────────────────────────────────────────────────────────────────────
-- listing_flags  (moderation reports)
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.listing_flags (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.marketplace_listings on delete cascade,
  reporter_id uuid references auth.users on delete set null,
  reason      text not null,
  resolved    boolean not null default false,
  resolved_by uuid references auth.users on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists listing_flags_listing_idx on public.listing_flags(listing_id);
create index if not exists listing_flags_resolved_idx on public.listing_flags(resolved);

alter table public.listing_flags enable row level security;

drop policy if exists "flags self insert" on public.listing_flags;
create policy "flags self insert" on public.listing_flags for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "flags admin all" on public.listing_flags;
create policy "flags admin all" on public.listing_flags for all
  using (public.is_admin()) with check (public.is_admin());

-- End of 0002_admin.sql
