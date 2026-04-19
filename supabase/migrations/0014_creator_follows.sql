-- Zentryx Lab — creator follows
--
-- One user follows another. Self-follows are prevented at the DB level.
-- Anyone can see who follows whom (public social graph); only the
-- follower can create / delete their own edge.
--
-- Counts are exposed via a helper view `creator_follow_counts`.

create table if not exists public.creator_follows (
  follower_id uuid not null references auth.users on delete cascade,
  creator_id  uuid not null references auth.users on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, creator_id),
  check (follower_id <> creator_id)
);

create index if not exists creator_follows_creator_idx
  on public.creator_follows(creator_id, created_at desc);
create index if not exists creator_follows_follower_idx
  on public.creator_follows(follower_id, created_at desc);

alter table public.creator_follows enable row level security;

-- Public read — follow graph is public (X / GitHub model).
drop policy if exists "follows public read" on public.creator_follows;
create policy "follows public read" on public.creator_follows
  for select using (true);

-- Only the follower may create / remove their own edge.
drop policy if exists "follows self insert" on public.creator_follows;
create policy "follows self insert" on public.creator_follows
  for insert with check (auth.uid() = follower_id);

drop policy if exists "follows self delete" on public.creator_follows;
create policy "follows self delete" on public.creator_follows
  for delete using (auth.uid() = follower_id);

-- Counts view: # of followers and # followed by a given user.
create or replace view public.creator_follow_counts as
  select
    u.id as user_id,
    coalesce((select count(*) from public.creator_follows f where f.creator_id  = u.id), 0)::int as followers_count,
    coalesce((select count(*) from public.creator_follows f where f.follower_id = u.id), 0)::int as following_count
  from auth.users u;

grant select on public.creator_follow_counts to anon, authenticated;

-- RPC: returns the creator's listings that shipped after the follower
-- started following them. Used to build the "new from followed creators"
-- feed on /overview.
create or replace function public.followed_creators_feed(_limit integer default 20)
returns table (
  listing_id   uuid,
  title        text,
  price_cents  integer,
  currency     text,
  thumbnail_url text,
  author_id    uuid,
  author_name  text,
  author_avatar text,
  created_at   timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    l.id,
    l.title,
    l.price_cents,
    l.currency,
    l.thumbnail_url,
    l.author_id,
    p.display_name,
    p.avatar_url,
    l.created_at
  from public.marketplace_listings l
  join public.creator_follows f
    on f.creator_id = l.author_id
   and f.follower_id = auth.uid()
  join public.public_profiles p on p.id = l.author_id
  where l.status = 'published'
    and l.created_at >= f.created_at
  order by l.created_at desc
  limit greatest(1, least(_limit, 100));
$$;

grant execute on function public.followed_creators_feed(integer) to authenticated;

-- End of 0014_creator_follows.sql
