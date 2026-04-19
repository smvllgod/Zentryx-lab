-- Zentryx Lab — AI conversations
-- Add a conversation aggregate so the panel can show history, support
-- multiple parallel chats, and let the user "New chat" without losing
-- the previous one.

create table if not exists public.ai_conversations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  strategy_id     uuid references public.strategies on delete set null,
  title           text not null default 'New chat',
  pinned          boolean not null default false,
  message_count   integer not null default 0,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists ai_conversations_user_idx
  on public.ai_conversations(user_id, last_message_at desc);
create index if not exists ai_conversations_strategy_idx
  on public.ai_conversations(strategy_id);

alter table public.ai_conversations enable row level security;

drop policy if exists "ai_conversations self read" on public.ai_conversations;
create policy "ai_conversations self read" on public.ai_conversations
  for select using (auth.uid() = user_id);

drop policy if exists "ai_conversations self update" on public.ai_conversations;
create policy "ai_conversations self update" on public.ai_conversations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ai_conversations self delete" on public.ai_conversations;
create policy "ai_conversations self delete" on public.ai_conversations
  for delete using (auth.uid() = user_id);

-- Conversation_id FK on ai_messages (nullable so old rows don't break).
-- Inserts continue to be done by the service role inside the Edge function.
alter table public.ai_messages
  add column if not exists conversation_id uuid references public.ai_conversations on delete cascade;

create index if not exists ai_messages_conversation_idx
  on public.ai_messages(conversation_id, created_at);
