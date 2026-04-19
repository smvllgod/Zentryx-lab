-- Zentryx Lab — notification preferences + new_follower kind
--
-- Extends the notifications system with per-kind preferences:
--   - in_app  (default: true)  — render in the topbar bell + /notifications
--   - email   (default: false) — forward by email (requires SMTP wiring
--                                 outside this migration; schema is ready)
--
-- Adds a `new_follower` kind plus a trigger on `creator_follows` so
-- following someone actually pings them.

-- Add the new kind to the enum. Safe to re-run.
alter type notification_kind add value if not exists 'new_follower';

create table if not exists public.notification_preferences (
  user_id    uuid not null references auth.users on delete cascade,
  kind       notification_kind not null,
  in_app     boolean not null default true,
  email      boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);

alter table public.notification_preferences enable row level security;

drop policy if exists "prefs own read" on public.notification_preferences;
create policy "prefs own read" on public.notification_preferences
  for select using (auth.uid() = user_id);

drop policy if exists "prefs own write" on public.notification_preferences;
create policy "prefs own write" on public.notification_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists "prefs own update" on public.notification_preferences;
create policy "prefs own update" on public.notification_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "prefs own delete" on public.notification_preferences;
create policy "prefs own delete" on public.notification_preferences
  for delete using (auth.uid() = user_id);

-- Extend emit_notification to honor in_app preference. Unknown kinds /
-- missing rows default to enabled, so existing triggers keep firing.
create or replace function public.emit_notification(
  p_user_id      uuid,
  p_kind         notification_kind,
  p_title        text,
  p_body         text,
  p_link         text,
  p_subject_type text,
  p_subject_id   uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_in_app boolean;
begin
  if p_user_id is null then return; end if;

  select in_app into v_in_app
    from public.notification_preferences
   where user_id = p_user_id and kind = p_kind;

  -- No row = default (enabled). Explicit false = opted out.
  if v_in_app is not distinct from false then
    return;
  end if;

  insert into public.notifications
    (user_id, kind, title, body, link, subject_type, subject_id)
  values
    (p_user_id, p_kind, p_title, p_body, p_link, p_subject_type, p_subject_id);
end $$;

-- New-follower trigger.
create or replace function public.notify_on_new_follower()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_follower_name text;
begin
  select display_name into v_follower_name
    from public.public_profiles
   where id = new.follower_id;
  if v_follower_name is null then v_follower_name := 'Someone'; end if;

  perform public.emit_notification(
    new.creator_id,
    'new_follower',
    v_follower_name || ' started following you',
    null,
    '/creator/' || new.follower_id::text,
    'follow',
    new.follower_id
  );
  return new;
end $$;

drop trigger if exists creator_follows_notify on public.creator_follows;
create trigger creator_follows_notify
  after insert on public.creator_follows
  for each row execute function public.notify_on_new_follower();

-- End of 0015_notification_prefs.sql
