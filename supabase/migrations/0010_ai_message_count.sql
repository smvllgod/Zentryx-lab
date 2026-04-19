-- Zentryx Lab — keep ai_conversations.message_count in sync automatically
--
-- The Netlify function previously relied on an RPC `bump_ai_conversation`
-- that was never shipped, so every conversation showed "0 msg" in the
-- history panel. Instead of creating the RPC and keeping the app in
-- charge of bookkeeping, we add a trigger on ai_messages that increments
-- / decrements the counter for us. Works regardless of which path wrote
-- the row (function, admin tools, future SDKs).

-- ── Trigger function ────────────────────────────────────────────────
create or replace function public.ai_messages_sync_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    if new.conversation_id is not null then
      update public.ai_conversations
         set message_count  = message_count + 1,
             last_message_at = greatest(last_message_at, new.created_at)
       where id = new.conversation_id;
    end if;
    return new;
  elsif (tg_op = 'DELETE') then
    if old.conversation_id is not null then
      update public.ai_conversations
         set message_count = greatest(message_count - 1, 0)
       where id = old.conversation_id;
    end if;
    return old;
  elsif (tg_op = 'UPDATE') then
    -- In the rare case a message gets reassigned, shift the count.
    if coalesce(new.conversation_id, '00000000-0000-0000-0000-000000000000'::uuid) <>
       coalesce(old.conversation_id, '00000000-0000-0000-0000-000000000000'::uuid) then
      if old.conversation_id is not null then
        update public.ai_conversations
           set message_count = greatest(message_count - 1, 0)
         where id = old.conversation_id;
      end if;
      if new.conversation_id is not null then
        update public.ai_conversations
           set message_count  = message_count + 1,
               last_message_at = greatest(last_message_at, new.created_at)
         where id = new.conversation_id;
      end if;
    end if;
    return new;
  end if;
  return null;
end $$;

-- ── Triggers ────────────────────────────────────────────────────────
drop trigger if exists ai_messages_sync_count_ins on public.ai_messages;
create trigger ai_messages_sync_count_ins
  after insert on public.ai_messages
  for each row execute function public.ai_messages_sync_count();

drop trigger if exists ai_messages_sync_count_del on public.ai_messages;
create trigger ai_messages_sync_count_del
  after delete on public.ai_messages
  for each row execute function public.ai_messages_sync_count();

drop trigger if exists ai_messages_sync_count_upd on public.ai_messages;
create trigger ai_messages_sync_count_upd
  after update of conversation_id on public.ai_messages
  for each row execute function public.ai_messages_sync_count();

-- ── Backfill existing conversations ─────────────────────────────────
-- One-time correction: every conversation currently reads 0 because the
-- old RPC was a no-op. Recompute from the stored messages.
update public.ai_conversations c
   set message_count = sub.n
  from (
    select conversation_id, count(*)::int as n
      from public.ai_messages
     where conversation_id is not null
     group by conversation_id
  ) sub
 where c.id = sub.conversation_id
   and c.message_count <> sub.n;

-- Also keep last_message_at honest if we have stored messages newer than it.
update public.ai_conversations c
   set last_message_at = sub.last_at
  from (
    select conversation_id, max(created_at) as last_at
      from public.ai_messages
     where conversation_id is not null
     group by conversation_id
  ) sub
 where c.id = sub.conversation_id
   and (c.last_message_at is null or c.last_message_at < sub.last_at);

-- End of 0010_ai_message_count.sql
