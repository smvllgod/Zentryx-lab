-- Zentryx Lab — AI helper usage tracking
-- Free tier  : 3 total messages (lifetime)
-- Pro tier   : 5 total messages (lifetime)
-- Creator    : 30 messages per day (daily reset at UTC midnight)
--
-- The `lifetime_count` column is only read for free/pro;
-- `daily_count` + `daily_reset_at` are only read for creator.
-- Server enforces both; client is advisory.

create table if not exists public.ai_usage (
  user_id         uuid primary key references auth.users on delete cascade,
  lifetime_count  integer not null default 0,
  daily_count     integer not null default 0,
  daily_reset_at  date not null default current_date,
  updated_at      timestamptz not null default now()
);

alter table public.ai_usage enable row level security;

-- Users can read their own quota (for the "3/3 used" UI).
drop policy if exists "ai_usage self read" on public.ai_usage;
create policy "ai_usage self read" on public.ai_usage
  for select using (auth.uid() = user_id);

-- Writes only happen via the Edge Function using the service role;
-- no public INSERT/UPDATE policy on purpose.

-- ── Message log ────────────────────────────────────────────────────
-- Stored so users can review their conversation history with the AI,
-- and so we can debug / compute usage analytics later. Content is a
-- JSONB array of Anthropic message blocks (text, tool_use, tool_result).
create table if not exists public.ai_messages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  strategy_id  uuid references public.strategies on delete set null,
  role         text not null check (role in ('user', 'assistant')),
  content      jsonb not null,
  tokens_in    integer,
  tokens_out   integer,
  created_at   timestamptz not null default now()
);

create index if not exists ai_messages_user_time_idx
  on public.ai_messages(user_id, created_at desc);

alter table public.ai_messages enable row level security;
drop policy if exists "ai_messages self read" on public.ai_messages;
create policy "ai_messages self read" on public.ai_messages
  for select using (auth.uid() = user_id);
