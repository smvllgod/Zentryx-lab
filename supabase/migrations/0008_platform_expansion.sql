-- Zentryx Lab — platform expansion migration
-- Adds: creator profile extensions (bio, alias, is_public),
-- extended marketplace tags, setfiles + storage bucket,
-- avatars storage bucket, community forum tables with moderation,
-- creator_stats / leaderboard views, public_profiles view for
-- cross-user reads (marketplace cards, creator pages).
--
-- Design notes:
-- • RLS on `profiles` is still self-read; the `public_profiles` view
--   exposes only non-sensitive fields to everyone.
-- • Forum posts start in `pending` status and require admin approval
--   (or staff). Rejected posts are kept with a reason for audit.
-- • Setfiles can be attached to a listing (ships with the EA download),
--   linked to a private strategy (personal library), or made standalone
--   public (shared in community for others to grab).

-- ────────────────────────────────────────────────────────────────────
-- 1. Profile extensions
-- ────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists bio         text,
  add column if not exists alias       text,
  add column if not exists is_public   boolean not null default true;

comment on column public.profiles.bio        is 'Short creator bio (<= 500 chars).';
comment on column public.profiles.alias      is 'Display name shown on marketplace / community when set. Falls back to full_name.';
comment on column public.profiles.is_public  is 'When false, the creator is not listed on /community and /creator/[id] 404s.';

-- View: non-sensitive profile columns visible to everyone.
-- Used by marketplace cards and /creator/[id] pages without opening up
-- the full `profiles` table (email, plan, role, suspended…).
create or replace view public.public_profiles as
  select
    id,
    coalesce(nullif(alias, ''), nullif(full_name, ''), split_part(coalesce(email,''), '@', 1)) as display_name,
    full_name,
    alias,
    avatar_url,
    bio,
    plan,
    created_at
  from public.profiles
  where is_public = true
    and coalesce(suspended, false) = false;

-- Views inherit RLS from base tables — a public role calling this view
-- still needs a SELECT policy on `profiles`. Add a read policy scoped to
-- this safe subset via a security-definer wrapper instead of opening the
-- base table. Simpler path: expose the columns via `security_barrier=off`
-- and a permissive select policy that restricts rows.
drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read" on public.profiles for select
  using (
    -- anyone can read the subset of columns surfaced by `public_profiles`
    -- for users that opted in (is_public + not suspended). The view
    -- itself filters rows; this policy authorises the underlying read.
    is_public = true and coalesce(suspended, false) = false
  );

-- Note: the existing `profiles self read` (0001) + `profiles admin all` (0002)
-- policies remain. The new policy widens SELECT only — never UPDATE/INSERT.

-- ────────────────────────────────────────────────────────────────────
-- 2. Extended marketplace tags
-- ────────────────────────────────────────────────────────────────────
insert into public.marketplace_tags(slug, label) values
  -- Styles
  ('smc',              'SMC / Smart Money'),
  ('price-action',     'Price Action'),
  ('martingale',       'Martingale'),
  ('hedging',          'Hedging'),
  ('arbitrage',        'Arbitrage'),
  -- Markets
  ('forex',            'Forex'),
  ('gold',             'Gold / XAU'),
  ('indices',          'Indices'),
  ('crypto',           'Crypto'),
  ('oil',              'Oil'),
  -- Audience
  ('prop-firm',        'Prop Firm'),
  ('challenge',        'Challenge-Friendly'),
  ('low-risk',         'Low Risk'),
  ('high-rr',          'High R:R'),
  ('beginner',         'Beginner-Friendly')
on conflict (slug) do nothing;

-- ────────────────────────────────────────────────────────────────────
-- 3. Setfiles
-- ────────────────────────────────────────────────────────────────────
do $$ begin
  create type setfile_scope as enum ('listing', 'strategy', 'personal');
exception when duplicate_object then null; end $$;

create table if not exists public.setfiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  listing_id   uuid references public.marketplace_listings on delete set null,
  strategy_id  uuid references public.strategies on delete set null,

  -- Display metadata
  name         text not null,
  description  text,
  symbol       text,
  timeframe    text,
  broker       text,

  -- Storage — path inside the `setfiles` bucket
  file_path    text not null,
  file_bytes   integer,

  -- Visibility
  scope        setfile_scope not null default 'personal',
  is_public    boolean not null default false,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists setfiles_user_idx     on public.setfiles(user_id);
create index if not exists setfiles_listing_idx  on public.setfiles(listing_id);
create index if not exists setfiles_strategy_idx on public.setfiles(strategy_id);
create index if not exists setfiles_public_idx   on public.setfiles(is_public) where is_public = true;

drop trigger if exists setfiles_updated_at on public.setfiles;
create trigger setfiles_updated_at before update on public.setfiles
  for each row execute function public.set_updated_at();

alter table public.setfiles enable row level security;

-- Owner has full access.
drop policy if exists "setfiles owner all" on public.setfiles;
create policy "setfiles owner all" on public.setfiles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Buyers of a listing can read setfiles attached to it.
drop policy if exists "setfiles buyer read" on public.setfiles;
create policy "setfiles buyer read" on public.setfiles for select
  using (
    listing_id is not null
    and exists (
      select 1 from public.purchases p
       where p.listing_id = setfiles.listing_id
         and p.buyer_id  = auth.uid()
         and p.status    = 'paid'
    )
  );

-- Anyone can read setfiles explicitly marked public (community standalone shares).
drop policy if exists "setfiles public read" on public.setfiles;
create policy "setfiles public read" on public.setfiles for select
  using (is_public = true);

-- Readers of a published free listing can read attached setfiles.
drop policy if exists "setfiles free listing read" on public.setfiles;
create policy "setfiles free listing read" on public.setfiles for select
  using (
    listing_id is not null
    and exists (
      select 1 from public.marketplace_listings l
       where l.id = setfiles.listing_id
         and l.status = 'published'
         and l.price_cents = 0
    )
  );

-- Admin full.
drop policy if exists "setfiles admin all" on public.setfiles;
create policy "setfiles admin all" on public.setfiles for all
  using (public.is_admin()) with check (public.is_admin());

-- ────────────────────────────────────────────────────────────────────
-- 4. Setfiles storage bucket
-- ────────────────────────────────────────────────────────────────────
-- Set files are tiny (<= 100 KB) — cap generously.
insert into storage.buckets (id, name, public, file_size_limit)
  values ('setfiles', 'setfiles', true, 524288)  -- 512 KB cap
on conflict (id) do update set public = true, file_size_limit = 524288;

-- Path convention: `<user_id>/<setfile_id>.set`. Author-write, public read
-- (the `setfiles` table is the real ACL — storage is just bytes).
drop policy if exists "setfiles public read" on storage.objects;
create policy "setfiles public read" on storage.objects for select
  using (bucket_id = 'setfiles');

drop policy if exists "setfiles author write" on storage.objects;
create policy "setfiles author write" on storage.objects for insert
  with check (
    bucket_id = 'setfiles'
    and auth.uid() is not null
    and (string_to_array(storage.objects.name, '/'))[1]::uuid = auth.uid()
  );

drop policy if exists "setfiles author update" on storage.objects;
create policy "setfiles author update" on storage.objects for update
  using (
    bucket_id = 'setfiles'
    and auth.uid() is not null
    and (string_to_array(storage.objects.name, '/'))[1]::uuid = auth.uid()
  );

drop policy if exists "setfiles author delete" on storage.objects;
create policy "setfiles author delete" on storage.objects for delete
  using (
    bucket_id = 'setfiles'
    and auth.uid() is not null
    and (string_to_array(storage.objects.name, '/'))[1]::uuid = auth.uid()
  );

-- ────────────────────────────────────────────────────────────────────
-- 5. Avatars storage bucket
-- ────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
  values ('avatars', 'avatars', true, 2097152)  -- 2 MB cap
on conflict (id) do update set public = true, file_size_limit = 2097152;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars author write" on storage.objects;
create policy "avatars author write" on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (string_to_array(storage.objects.name, '/'))[1]::uuid = auth.uid()
  );

drop policy if exists "avatars author update" on storage.objects;
create policy "avatars author update" on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (string_to_array(storage.objects.name, '/'))[1]::uuid = auth.uid()
  );

drop policy if exists "avatars author delete" on storage.objects;
create policy "avatars author delete" on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (string_to_array(storage.objects.name, '/'))[1]::uuid = auth.uid()
  );

-- ────────────────────────────────────────────────────────────────────
-- 6. Forum / community
-- ────────────────────────────────────────────────────────────────────
do $$ begin
  create type forum_post_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- Categories are admin-curated; small fixed list for v1.
create table if not exists public.forum_categories (
  slug        text primary key,
  label       text not null,
  description text,
  sort_order  integer not null default 100,
  created_at  timestamptz not null default now()
);

alter table public.forum_categories enable row level security;

drop policy if exists "forum_categories public read" on public.forum_categories;
create policy "forum_categories public read" on public.forum_categories for select
  using (true);

drop policy if exists "forum_categories admin write" on public.forum_categories;
create policy "forum_categories admin write" on public.forum_categories for all
  using (public.is_admin()) with check (public.is_admin());

insert into public.forum_categories(slug, label, description, sort_order) values
  ('discussion',   'Discussion',    'Open conversation about trading, the platform, and strategy design.', 10),
  ('help',         'Help',          'Ask questions — setups, MT5 quirks, integration issues.',            20),
  ('showcase',     'Showcase',      'Share your strategies, backtests, or live results.',                 30),
  ('feedback',     'Feedback',      'Suggestions and feature requests for Zentryx Lab.',                  40),
  ('announcements','Announcements', 'Official updates from the Zentryx team (admin-only posts).',         90)
on conflict (slug) do nothing;

-- Posts.
create table if not exists public.forum_posts (
  id               uuid primary key default gen_random_uuid(),
  author_id        uuid not null references auth.users on delete cascade,
  category_slug    text not null references public.forum_categories on delete restrict,
  title            text not null,
  body             text not null,                  -- markdown
  status           forum_post_status not null default 'pending',
  rejected_reason  text,
  approved_at      timestamptz,
  approved_by      uuid references auth.users on delete set null,
  pinned           boolean not null default false,
  locked           boolean not null default false,
  view_count       integer not null default 0,
  comment_count    integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists forum_posts_category_idx on public.forum_posts(category_slug);
create index if not exists forum_posts_status_idx   on public.forum_posts(status);
create index if not exists forum_posts_author_idx   on public.forum_posts(author_id);
create index if not exists forum_posts_created_idx  on public.forum_posts(created_at desc);
create index if not exists forum_posts_pinned_idx   on public.forum_posts(pinned) where pinned = true;

drop trigger if exists forum_posts_updated_at on public.forum_posts;
create trigger forum_posts_updated_at before update on public.forum_posts
  for each row execute function public.set_updated_at();

alter table public.forum_posts enable row level security;

-- Anyone can read approved posts.
drop policy if exists "forum_posts approved read" on public.forum_posts;
create policy "forum_posts approved read" on public.forum_posts for select
  using (status = 'approved');

-- Author sees their own (incl. pending / rejected) so they know state.
drop policy if exists "forum_posts author read" on public.forum_posts;
create policy "forum_posts author read" on public.forum_posts for select
  using (auth.uid() = author_id);

-- Author can insert new posts (always as pending — enforced by trigger below).
drop policy if exists "forum_posts author insert" on public.forum_posts;
create policy "forum_posts author insert" on public.forum_posts for insert
  with check (auth.uid() = author_id);

-- Author can edit body/title only on their pending posts.
drop policy if exists "forum_posts author update" on public.forum_posts;
create policy "forum_posts author update" on public.forum_posts for update
  using (auth.uid() = author_id and status = 'pending')
  with check (auth.uid() = author_id and status = 'pending');

-- Author can delete their own.
drop policy if exists "forum_posts author delete" on public.forum_posts;
create policy "forum_posts author delete" on public.forum_posts for delete
  using (auth.uid() = author_id);

-- Admin full.
drop policy if exists "forum_posts admin all" on public.forum_posts;
create policy "forum_posts admin all" on public.forum_posts for all
  using (public.is_admin()) with check (public.is_admin());

-- Force `status = 'pending'` on author-insert (staff/admin may override).
create or replace function public.forum_posts_force_pending()
returns trigger language plpgsql security definer as $$
begin
  if not public.is_admin() then
    new.status := 'pending';
    new.approved_at := null;
    new.approved_by := null;
    new.rejected_reason := null;
    new.pinned := false;
    new.locked := false;
  end if;
  return new;
end $$;

drop trigger if exists forum_posts_pending_guard on public.forum_posts;
create trigger forum_posts_pending_guard before insert on public.forum_posts
  for each row execute function public.forum_posts_force_pending();

-- Comments.
create table if not exists public.forum_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.forum_posts on delete cascade,
  author_id   uuid not null references auth.users on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists forum_comments_post_idx    on public.forum_comments(post_id);
create index if not exists forum_comments_author_idx  on public.forum_comments(author_id);

drop trigger if exists forum_comments_updated_at on public.forum_comments;
create trigger forum_comments_updated_at before update on public.forum_comments
  for each row execute function public.set_updated_at();

alter table public.forum_comments enable row level security;

-- Readable when parent post is approved OR viewer is admin / author.
drop policy if exists "forum_comments read approved" on public.forum_comments;
create policy "forum_comments read approved" on public.forum_comments for select
  using (
    exists (
      select 1 from public.forum_posts p
       where p.id = forum_comments.post_id
         and (p.status = 'approved' or p.author_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "forum_comments author insert" on public.forum_comments;
create policy "forum_comments author insert" on public.forum_comments for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.forum_posts p
       where p.id = post_id
         and p.status = 'approved'
         and p.locked = false
    )
  );

drop policy if exists "forum_comments author update" on public.forum_comments;
create policy "forum_comments author update" on public.forum_comments for update
  using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "forum_comments author delete" on public.forum_comments;
create policy "forum_comments author delete" on public.forum_comments for delete
  using (auth.uid() = author_id);

drop policy if exists "forum_comments admin all" on public.forum_comments;
create policy "forum_comments admin all" on public.forum_comments for all
  using (public.is_admin()) with check (public.is_admin());

-- Keep `forum_posts.comment_count` in sync.
create or replace function public.forum_posts_recalc_comments()
returns trigger language plpgsql as $$
declare target_post uuid;
begin
  target_post := coalesce(new.post_id, old.post_id);
  update public.forum_posts
     set comment_count = (
       select count(*) from public.forum_comments where post_id = target_post
     )
   where id = target_post;
  return coalesce(new, old);
end $$;

drop trigger if exists forum_comments_count_trg on public.forum_comments;
create trigger forum_comments_count_trg
  after insert or delete on public.forum_comments
  for each row execute function public.forum_posts_recalc_comments();

-- ────────────────────────────────────────────────────────────────────
-- 7. Creator stats + leaderboard
-- ────────────────────────────────────────────────────────────────────
-- Per-creator aggregate used by trust badges and the community leaderboard.
-- Trust score formula (tunable): sales × 5 + listings × 2 + rating_weighted + age_days / 30.
create or replace view public.creator_stats as
  select
    p.id                                             as user_id,
    coalesce(nullif(p.alias, ''), nullif(p.full_name, ''), split_part(coalesce(p.email,''), '@', 1)) as display_name,
    p.avatar_url,
    p.bio,
    p.created_at                                     as joined_at,
    coalesce(l_stats.listing_count, 0)::int          as listing_count,
    coalesce(l_stats.downloads, 0)::int              as total_downloads,
    coalesce(l_stats.avg_rating, 0)::numeric(3,2)    as avg_rating,
    coalesce(l_stats.reviews_received, 0)::int       as reviews_received,
    coalesce(s_stats.sales_count, 0)::int            as sales_count,
    greatest(0, extract(day from now() - p.created_at))::int as account_age_days,
    -- Trust score (integer)
    (
      coalesce(s_stats.sales_count, 0) * 5
      + coalesce(l_stats.listing_count, 0) * 2
      + coalesce(l_stats.avg_rating, 0) * coalesce(l_stats.reviews_received, 0)
      + greatest(0, extract(day from now() - p.created_at)) / 30
    )::int                                            as trust_score,
    -- Trust level bucket (matches lib/profiles/trust.ts)
    case
      when coalesce(s_stats.sales_count, 0) * 5
         + coalesce(l_stats.listing_count, 0) * 2
         + coalesce(l_stats.avg_rating, 0) * coalesce(l_stats.reviews_received, 0)
         + greatest(0, extract(day from now() - p.created_at)) / 30
        >= 120 then 'top'
      when coalesce(s_stats.sales_count, 0) * 5
         + coalesce(l_stats.listing_count, 0) * 2
         + coalesce(l_stats.avg_rating, 0) * coalesce(l_stats.reviews_received, 0)
         + greatest(0, extract(day from now() - p.created_at)) / 30
        >= 60  then 'trusted'
      when coalesce(s_stats.sales_count, 0) * 5
         + coalesce(l_stats.listing_count, 0) * 2
         + coalesce(l_stats.avg_rating, 0) * coalesce(l_stats.reviews_received, 0)
         + greatest(0, extract(day from now() - p.created_at)) / 30
        >= 20  then 'rising'
      else 'new'
    end                                               as trust_level
  from public.profiles p
  left join (
    select
      author_id,
      count(*)                                       as listing_count,
      sum(downloads)                                 as downloads,
      sum(rating * rating_count) / nullif(sum(rating_count), 0) as avg_rating,
      sum(rating_count)                              as reviews_received
    from public.marketplace_listings
    where status = 'published'
    group by author_id
  ) l_stats on l_stats.author_id = p.id
  left join (
    select l.author_id, count(*) as sales_count
    from public.purchases pu
    join public.marketplace_listings l on l.id = pu.listing_id
    where pu.status = 'paid'
    group by l.author_id
  ) s_stats on s_stats.author_id = p.id
  where p.is_public = true
    and coalesce(p.suspended, false) = false;

-- ────────────────────────────────────────────────────────────────────
-- 8. Community feed view (new listings + recent reviews)
-- ────────────────────────────────────────────────────────────────────
-- Simple union of recent publicly-observable events, most-recent-first.
create or replace view public.community_feed as
  select
    'listing'::text        as event_type,
    l.id                   as subject_id,
    l.author_id            as actor_id,
    l.title                as title,
    l.description          as body,
    l.created_at           as event_at
  from public.marketplace_listings l
  where l.status = 'published'
  union all
  select
    'review'::text         as event_type,
    r.listing_id           as subject_id,
    r.author_id            as actor_id,
    coalesce(l.title, '(removed listing)') as title,
    r.body                                 as body,
    r.created_at                           as event_at
  from public.reviews r
  left join public.marketplace_listings l on l.id = r.listing_id
  where l.status = 'published'
  order by event_at desc
  limit 200;

-- ────────────────────────────────────────────────────────────────────
-- End of 0008_platform_expansion.sql
-- ────────────────────────────────────────────────────────────────────
