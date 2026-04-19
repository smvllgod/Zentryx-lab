-- Zentryx Lab — download counter RPC, notifications, block analytics rewrite
--
-- Addresses three issues reported after the platform expansion rollout:
-- 1. `marketplace_listings.downloads` never incremented because RLS blocks
--    buyer updates. Added a SECURITY DEFINER RPC that any authenticated
--    user can call for free listings.
-- 2. `block_analytics` view read from the empty `block_usage_events`
--    table — rewrite to aggregate directly from `strategies.graph` JSONB
--    so it reflects real in-builder usage without per-action logging.
-- 3. New `notifications` table + triggers that fan out events
--    (purchase, review, comment, post approval / rejection) to the
--    relevant user. Drives the topbar bell + /notifications page.

-- ────────────────────────────────────────────────────────────────────
-- 1. Download counter RPC
-- ────────────────────────────────────────────────────────────────────
-- Free listings only — paid downloads go through the purchase flow.
-- Idempotent on (listing_id, buyer_id): a single user counts once even
-- if they download the ZIP multiple times.

alter table public.purchases
  add constraint purchases_listing_buyer_unique unique (listing_id, buyer_id);

create or replace function public.register_listing_download(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_price   integer;
  v_status  text;
  v_author  uuid;
  v_was_new boolean;
begin
  if v_user is null then
    -- Anonymous download attempts simply no-op; the download itself
    -- already happened client-side, we just can't attribute it.
    return;
  end if;

  select l.price_cents, l.status, l.author_id
    into v_price, v_status, v_author
    from public.marketplace_listings l
   where l.id = p_listing_id;

  if v_price is null then return; end if;        -- unknown listing
  if v_status <> 'published' then return; end if; -- not published
  if v_price > 0 then return; end if;            -- paid path: use the purchase flow

  -- Insert a purchase row for the download (audit trail). The unique
  -- constraint above means retries silently no-op for the same user.
  insert into public.purchases (listing_id, buyer_id, price_cents, currency, status)
    values (p_listing_id, v_user, 0, 'USD', 'paid')
  on conflict (listing_id, buyer_id) do nothing;

  v_was_new := found;

  -- Only bump the counter on the first download per user.
  if v_was_new then
    update public.marketplace_listings
       set downloads = downloads + 1
     where id = p_listing_id;
  end if;
end $$;

grant execute on function public.register_listing_download(uuid) to authenticated, anon;

-- ────────────────────────────────────────────────────────────────────
-- 2. Block analytics — derive from strategies.graph JSONB
-- ────────────────────────────────────────────────────────────────────
-- The old view summed rows from block_usage_events (never populated).
-- This replacement unpacks every node from every user's strategies
-- graph and aggregates usage by node.type. Shape matches the original
-- consumer in lib/admin/queries.ts:listBlockAnalytics().

create or replace view public.block_analytics as
  with expanded as (
    select
      s.user_id,
      s.updated_at,
      (node ->> 'type')::text as block_id
    from public.strategies s,
         lateral jsonb_array_elements(coalesce(s.graph -> 'nodes', '[]'::jsonb)) as node
    where jsonb_typeof(s.graph -> 'nodes') = 'array'
  )
  select
    block_id,
    count(*)::int                  as usage_count,
    count(distinct user_id)::int   as unique_users,
    max(updated_at)                as last_used_at
  from expanded
  where block_id is not null and block_id <> ''
  group by block_id;

-- ────────────────────────────────────────────────────────────────────
-- 3. Notifications
-- ────────────────────────────────────────────────────────────────────
do $$ begin
  create type notification_kind as enum (
    'purchase',           -- someone bought / downloaded your listing
    'review',             -- someone reviewed your listing
    'comment',            -- someone commented on your post
    'post_approved',      -- moderator approved your pending post
    'post_rejected',      -- moderator rejected your pending post
    'license_issued',     -- you received a license
    'license_revoked',    -- a license you own was revoked
    'system'              -- generic platform message
  );
exception when duplicate_object then null; end $$;

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  kind         notification_kind not null,
  title        text not null,
  body         text,
  -- Optional deep-link — used by the bell dropdown.
  link         text,
  -- Optional references to the originating row for future grouping.
  subject_type text,
  subject_id   uuid,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists notifications_user_idx       on public.notifications(user_id);
create index if not exists notifications_created_idx    on public.notifications(created_at desc);
create index if not exists notifications_unread_idx     on public.notifications(user_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "notifications own read" on public.notifications;
create policy "notifications own read" on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own update" on public.notifications for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notifications own delete" on public.notifications;
create policy "notifications own delete" on public.notifications for delete
  using (auth.uid() = user_id);

drop policy if exists "notifications admin all" on public.notifications;
create policy "notifications admin all" on public.notifications for all
  using (public.is_admin()) with check (public.is_admin());

-- Inserts are done via SECURITY DEFINER triggers below; no client policy.

-- Internal helper — used by every trigger.
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
begin
  if p_user_id is null then return; end if;
  insert into public.notifications
    (user_id, kind, title, body, link, subject_type, subject_id)
  values
    (p_user_id, p_kind, p_title, p_body, p_link, p_subject_type, p_subject_id);
end $$;

-- Purchase → notify listing author.
create or replace function public.notify_on_purchase()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
  v_title  text;
  v_is_free boolean;
begin
  -- Only fire on paid status (either insert paid, or update paid).
  if tg_op = 'INSERT' and new.status <> 'paid' then return new; end if;
  if tg_op = 'UPDATE' and (old.status = new.status or new.status <> 'paid') then return new; end if;

  select author_id, title, price_cents = 0
    into v_author, v_title, v_is_free
    from public.marketplace_listings
   where id = new.listing_id;

  if v_author is null or v_author = new.buyer_id then
    return new; -- own listing or unknown
  end if;

  perform public.emit_notification(
    v_author,
    'purchase',
    (case when v_is_free then 'New download' else 'New sale' end),
    coalesce(v_title, 'Your strategy') || ' — ' ||
      (case when v_is_free then 'someone downloaded it' else 'someone bought it' end),
    '/marketplace/listing?id=' || new.listing_id::text,
    'listing',
    new.listing_id
  );
  return new;
end $$;

drop trigger if exists purchases_notify on public.purchases;
create trigger purchases_notify
  after insert or update on public.purchases
  for each row execute function public.notify_on_purchase();

-- Review → notify listing author.
create or replace function public.notify_on_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
  v_title  text;
begin
  select author_id, title
    into v_author, v_title
    from public.marketplace_listings
   where id = new.listing_id;

  if v_author is null or v_author = new.author_id then return new; end if;

  perform public.emit_notification(
    v_author,
    'review',
    new.rating || '-star review',
    coalesce(v_title, 'Your strategy') || ' got a new review.',
    '/marketplace/listing?id=' || new.listing_id::text,
    'listing',
    new.listing_id
  );
  return new;
end $$;

drop trigger if exists reviews_notify on public.reviews;
create trigger reviews_notify
  after insert on public.reviews
  for each row execute function public.notify_on_review();

-- Forum comment → notify post author.
create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
  v_title  text;
begin
  select author_id, title
    into v_author, v_title
    from public.forum_posts
   where id = new.post_id;

  if v_author is null or v_author = new.author_id then return new; end if;

  perform public.emit_notification(
    v_author,
    'comment',
    'New comment',
    'Someone replied to "' || coalesce(v_title, 'your post') || '".',
    '/community/posts/' || new.post_id::text,
    'forum_post',
    new.post_id
  );
  return new;
end $$;

drop trigger if exists forum_comments_notify on public.forum_comments;
create trigger forum_comments_notify
  after insert on public.forum_comments
  for each row execute function public.notify_on_comment();

-- Forum post status change → notify post author.
create or replace function public.notify_on_post_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status is not distinct from new.status then
    return new;
  end if;
  if new.status = 'approved' then
    perform public.emit_notification(
      new.author_id,
      'post_approved',
      'Post approved',
      '"' || new.title || '" is now live in the community.',
      '/community/posts/' || new.id::text,
      'forum_post',
      new.id
    );
  elsif new.status = 'rejected' then
    perform public.emit_notification(
      new.author_id,
      'post_rejected',
      'Post rejected',
      coalesce(nullif(new.rejected_reason, ''), 'See the post for the moderator''s reason.'),
      '/community/posts/' || new.id::text,
      'forum_post',
      new.id
    );
  end if;
  return new;
end $$;

drop trigger if exists forum_posts_status_notify on public.forum_posts;
create trigger forum_posts_status_notify
  after update of status on public.forum_posts
  for each row execute function public.notify_on_post_status();

-- License issued → notify buyer (when buyer_id is set).
create or replace function public.notify_on_license()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text;
begin
  if tg_op = 'INSERT' then
    if new.buyer_id is null then return new; end if;
    select title into v_title from public.marketplace_listings where id = new.listing_id;
    perform public.emit_notification(
      new.buyer_id,
      'license_issued',
      'You received a license',
      'A license key for ' || coalesce(v_title, 'a strategy') || ' is now in your account.',
      '/licenses',
      'license',
      new.id
    );
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.revoked = false
     and new.revoked = true
     and new.buyer_id is not null
  then
    select title into v_title from public.marketplace_listings where id = new.listing_id;
    perform public.emit_notification(
      new.buyer_id,
      'license_revoked',
      'Your license was revoked',
      coalesce(nullif(new.revoke_reason, ''), 'The issuer revoked this license.'),
      '/licenses',
      'license',
      new.id
    );
  end if;
  return new;
end $$;

drop trigger if exists licenses_notify on public.licenses;
create trigger licenses_notify
  after insert or update on public.licenses
  for each row execute function public.notify_on_license();

-- ────────────────────────────────────────────────────────────────────
-- End of 0009_downloads_notifications_analytics.sql
-- ────────────────────────────────────────────────────────────────────
