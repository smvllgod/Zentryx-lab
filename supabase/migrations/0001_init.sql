-- Zentryx Lab — initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Uses Postgres + RLS. All user-owned tables enforce row-level security.

-- ────────────────────────────────────────────────────────────────────
-- Enums
-- ────────────────────────────────────────────────────────────────────
do $$ begin
  create type plan_tier as enum ('free', 'pro', 'creator');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum (
    'active','trialing','canceled','incomplete','past_due'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type strategy_status as enum ('draft','validated','exported','published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type listing_status as enum ('draft','published','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type purchase_status as enum ('pending','paid','refunded','failed');
exception when duplicate_object then null; end $$;

-- ────────────────────────────────────────────────────────────────────
-- Helper: updated_at trigger
-- ────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ────────────────────────────────────────────────────────────────────
-- profiles  (1:1 with auth.users)
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  plan        plan_tier not null default 'free',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles self read"  on public.profiles;
drop policy if exists "profiles self write" on public.profiles;
create policy "profiles self read"  on public.profiles for select using (auth.uid() = id);
create policy "profiles self write" on public.profiles for update using (auth.uid() = id);
create policy "profiles self insert" on public.profiles for insert with check (auth.uid() = id);

-- Bootstrap a profile row for every new auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────────────
-- subscriptions
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users on delete cascade,
  plan                     plan_tier not null default 'free',
  status                   subscription_status not null default 'active',
  current_period_end       timestamptz,
  stripe_customer_id       text,
  stripe_subscription_id   text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists subscriptions_user_idx on public.subscriptions(user_id);
drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;
drop policy if exists "subs self read" on public.subscriptions;
create policy "subs self read" on public.subscriptions for select using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────
-- strategies (visual graph is the source of truth, not generated code)
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.strategies (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  description text,
  platform    text not null default 'mt5',
  graph       jsonb not null default '{}'::jsonb,
  status      strategy_status not null default 'draft',
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists strategies_user_idx on public.strategies(user_id);
create index if not exists strategies_status_idx on public.strategies(status);
drop trigger if exists strategies_updated_at on public.strategies;
create trigger strategies_updated_at before update on public.strategies
  for each row execute function public.set_updated_at();

alter table public.strategies enable row level security;
drop policy if exists "strategies owner all" on public.strategies;
create policy "strategies owner all" on public.strategies for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────
-- strategy_versions (immutable snapshots after generate/save)
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.strategy_versions (
  id              uuid primary key default gen_random_uuid(),
  strategy_id     uuid not null references public.strategies on delete cascade,
  version         integer not null,
  graph           jsonb not null,
  generated_code  text,
  summary         text,
  created_by      uuid not null references auth.users on delete set null,
  created_at      timestamptz not null default now(),
  unique (strategy_id, version)
);

create index if not exists strategy_versions_strategy_idx on public.strategy_versions(strategy_id);

alter table public.strategy_versions enable row level security;
drop policy if exists "versions owner read" on public.strategy_versions;
create policy "versions owner read" on public.strategy_versions for select
  using (exists (select 1 from public.strategies s
                 where s.id = strategy_id and s.user_id = auth.uid()));
drop policy if exists "versions owner insert" on public.strategy_versions;
create policy "versions owner insert" on public.strategy_versions for insert
  with check (exists (select 1 from public.strategies s
                      where s.id = strategy_id and s.user_id = auth.uid()));

-- ────────────────────────────────────────────────────────────────────
-- exports  (history of .mq5 downloads)
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.exports (
  id          uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references public.strategies on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  version_id  uuid references public.strategy_versions on delete set null,
  filename    text not null,
  source      text not null,
  created_at  timestamptz not null default now()
);

create index if not exists exports_user_idx on public.exports(user_id);

alter table public.exports enable row level security;
drop policy if exists "exports owner all" on public.exports;
create policy "exports owner all" on public.exports for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────
-- marketplace_tags
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.marketplace_tags (
  slug       text primary key,
  label      text not null,
  created_at timestamptz not null default now()
);

alter table public.marketplace_tags enable row level security;
drop policy if exists "tags read all" on public.marketplace_tags;
create policy "tags read all" on public.marketplace_tags for select using (true);

insert into public.marketplace_tags(slug, label) values
  ('trend', 'Trend Following'),
  ('scalping', 'Scalping'),
  ('breakout', 'Breakout'),
  ('reversal', 'Mean Reversion'),
  ('grid', 'Grid'),
  ('news', 'News'),
  ('multi-pair', 'Multi-Pair')
on conflict (slug) do nothing;

-- ────────────────────────────────────────────────────────────────────
-- marketplace_listings
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.marketplace_listings (
  id            uuid primary key default gen_random_uuid(),
  strategy_id   uuid not null references public.strategies on delete cascade,
  author_id     uuid not null references auth.users on delete cascade,
  title         text not null,
  description   text not null,
  thumbnail_url text,
  price_cents   integer not null default 0,
  currency      text not null default 'USD',
  tags          text[] not null default '{}',
  status        listing_status not null default 'draft',
  downloads     integer not null default 0,
  rating        numeric(3,2),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists listings_status_idx on public.marketplace_listings(status);
create index if not exists listings_author_idx on public.marketplace_listings(author_id);
drop trigger if exists listings_updated_at on public.marketplace_listings;
create trigger listings_updated_at before update on public.marketplace_listings
  for each row execute function public.set_updated_at();

alter table public.marketplace_listings enable row level security;
drop policy if exists "listings published readable" on public.marketplace_listings;
create policy "listings published readable" on public.marketplace_listings for select
  using (status = 'published' or auth.uid() = author_id);
drop policy if exists "listings author write" on public.marketplace_listings;
create policy "listings author write" on public.marketplace_listings for all
  using (auth.uid() = author_id) with check (auth.uid() = author_id);

-- ────────────────────────────────────────────────────────────────────
-- purchases
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.purchases (
  id                     uuid primary key default gen_random_uuid(),
  listing_id             uuid not null references public.marketplace_listings on delete cascade,
  buyer_id               uuid not null references auth.users on delete cascade,
  price_cents            integer not null,
  currency               text not null default 'USD',
  status                 purchase_status not null default 'pending',
  stripe_payment_intent  text,
  created_at             timestamptz not null default now()
);

create index if not exists purchases_buyer_idx on public.purchases(buyer_id);

alter table public.purchases enable row level security;
drop policy if exists "purchases buyer read" on public.purchases;
create policy "purchases buyer read" on public.purchases for select using (auth.uid() = buyer_id);

-- ────────────────────────────────────────────────────────────────────
-- reviews
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.marketplace_listings on delete cascade,
  author_id   uuid not null references auth.users on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  body        text,
  created_at  timestamptz not null default now()
);

create index if not exists reviews_listing_idx on public.reviews(listing_id);

alter table public.reviews enable row level security;
drop policy if exists "reviews readable" on public.reviews;
create policy "reviews readable" on public.reviews for select using (true);
drop policy if exists "reviews author write" on public.reviews;
create policy "reviews author write" on public.reviews for all
  using (auth.uid() = author_id) with check (auth.uid() = author_id);

-- ────────────────────────────────────────────────────────────────────
-- favorites (user ↔ listing)
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.favorites (
  user_id    uuid not null references auth.users on delete cascade,
  listing_id uuid not null references public.marketplace_listings on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.favorites enable row level security;
drop policy if exists "favorites self all" on public.favorites;
create policy "favorites self all" on public.favorites for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
