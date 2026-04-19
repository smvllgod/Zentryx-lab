-- Zentryx Lab — Live telemetry from deployed EAs
--
-- Every exported EA gets a unique `telemetry_token` (a random UUID)
-- stamped on the `strategies` row. The MQL5 template uses that token
-- to POST trade events to our Netlify function; the function verifies
-- it against the DB and inserts a row into `strategy_telemetry_events`.
--
-- Token rotation: the author can rotate their token from the /strategies
-- page, which invalidates any EA copy still running on the old token.

-- ── Column on strategies ────────────────────────────────────────────
alter table public.strategies
  add column if not exists telemetry_token uuid unique default gen_random_uuid();

-- Back-fill for rows that existed before the column was added.
update public.strategies set telemetry_token = gen_random_uuid() where telemetry_token is null;

-- Author can turn live-feed on their marketplace listings on/off.
alter table public.marketplace_listings
  add column if not exists live_feed_enabled boolean not null default false;

-- ── Events table ────────────────────────────────────────────────────
-- One row per closed trade reported by the live EA. Open trades are NOT
-- stored — the EA reports on close with the full lifecycle (open time,
-- open price, close time, close price, pnl, lots, side, reason).
create table if not exists public.strategy_telemetry_events (
  id               uuid primary key default gen_random_uuid(),
  strategy_id      uuid not null references public.strategies on delete cascade,
  user_id          uuid not null references auth.users on delete cascade,
  -- Trade identification (broker-supplied). We treat (strategy_id, ticket) as
  -- effectively unique even if an EA reports twice; ON CONFLICT skips.
  ticket           bigint not null,
  symbol           text not null,
  timeframe        text,
  side             text not null check (side in ('long', 'short')),
  open_time        timestamptz not null,
  open_price       numeric(20, 6) not null,
  close_time       timestamptz not null,
  close_price      numeric(20, 6) not null,
  lots             numeric(10, 4) not null,
  pnl_cash         numeric(14, 4) not null,
  pnl_pips         numeric(10, 2),
  close_reason     text,
  equity_after     numeric(14, 4),
  balance_after    numeric(14, 4),
  account_currency text,
  broker           text,
  ea_version       text,
  extra            jsonb not null default '{}'::jsonb,
  reported_at      timestamptz not null default now()
);

-- Dedup: same strategy + same broker ticket is always the same trade.
create unique index if not exists tel_unique_strategy_ticket
  on public.strategy_telemetry_events(strategy_id, ticket);

create index if not exists tel_strategy_time_idx
  on public.strategy_telemetry_events(strategy_id, close_time desc);

create index if not exists tel_user_time_idx
  on public.strategy_telemetry_events(user_id, close_time desc);

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.strategy_telemetry_events enable row level security;

-- Owner can always read their own.
drop policy if exists "telemetry owner read" on public.strategy_telemetry_events;
create policy "telemetry owner read" on public.strategy_telemetry_events
  for select using (auth.uid() = user_id);

-- Public read for listings that opted into live_feed_enabled.
drop policy if exists "telemetry listing public read" on public.strategy_telemetry_events;
create policy "telemetry listing public read" on public.strategy_telemetry_events
  for select using (
    exists (
      select 1 from public.marketplace_listings l
       where l.strategy_id = strategy_telemetry_events.strategy_id
         and l.status = 'published'
         and l.live_feed_enabled = true
    )
  );

-- Writes ONLY through the Netlify function using the service role — no
-- public write policy on purpose.

-- ── Aggregated live-stats RPC (for listing badges / strategy page) ──
-- Returns rolling 30-day and lifetime stats so the client doesn't need
-- to pull raw trades just to render a badge.
create or replace function public.strategy_live_stats(_strategy_id uuid)
returns table (
  trades_30d    integer,
  win_rate_30d  numeric,
  pnl_30d       numeric,
  trades_total  integer,
  win_rate_total numeric,
  pnl_total     numeric,
  last_trade_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with base as (
    select *
      from public.strategy_telemetry_events
     where strategy_id = _strategy_id
  ),
  w30 as (
    select count(*) filter (where close_time >= now() - interval '30 days') as n,
           count(*) filter (where close_time >= now() - interval '30 days' and pnl_cash > 0) as w,
           coalesce(sum(pnl_cash) filter (where close_time >= now() - interval '30 days'), 0) as p,
           count(*) as total,
           count(*) filter (where pnl_cash > 0) as total_w,
           coalesce(sum(pnl_cash), 0) as total_p,
           max(close_time) as last_t
      from base
  )
  select
    n::int,
    case when n = 0 then 0 else round((w::numeric / n) * 100, 2) end,
    round(p, 2),
    total::int,
    case when total = 0 then 0 else round((total_w::numeric / total) * 100, 2) end,
    round(total_p, 2),
    last_t
  from w30;
$$;

grant execute on function public.strategy_live_stats(uuid) to anon, authenticated;

-- End of 0012_strategy_telemetry.sql
