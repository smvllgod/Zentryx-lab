-- Zentryx Lab — Social feed (distinct from the forum)
--
-- The forum (forum_posts / forum_comments) is for long-form discussion
-- threaded under categories: moderated, markdown, search-friendly.
--
-- The feed is the fast lane: short status-style posts with images, no
-- category required, comments and likes inline. It's how creators show
-- what they're working on, share a setup screenshot, announce a new
-- listing, or ask a quick question.

-- Small, constrained fields; images live in the same forum-images bucket
-- (reused on purpose — one bucket, one RLS rule) because both surfaces
-- need the exact same "author uploads to their own prefix" policy.

create table if not exists public.feed_posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references auth.users on delete cascade,
  body        text not null check (char_length(body) between 1 and 2000),
  image_urls  text[] not null default '{}',
  like_count    integer not null default 0,
  comment_count integer not null default 0,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists feed_posts_author_time_idx
  on public.feed_posts(author_id, created_at desc);
create index if not exists feed_posts_time_idx
  on public.feed_posts(created_at desc)
  where deleted_at is null;

alter table public.feed_posts enable row level security;

-- Anyone can read non-deleted posts.
drop policy if exists "feed public read" on public.feed_posts;
create policy "feed public read" on public.feed_posts
  for select using (deleted_at is null);

-- Author writes / soft-deletes their own posts.
drop policy if exists "feed author write" on public.feed_posts;
create policy "feed author write" on public.feed_posts
  for insert with check (auth.uid() = author_id);

drop policy if exists "feed author update" on public.feed_posts;
create policy "feed author update" on public.feed_posts
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "feed author delete" on public.feed_posts;
create policy "feed author delete" on public.feed_posts
  for delete using (auth.uid() = author_id);

-- ── Likes ──────────────────────────────────────────────────────────
create table if not exists public.feed_likes (
  post_id     uuid not null references public.feed_posts on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists feed_likes_post_idx on public.feed_likes(post_id);

alter table public.feed_likes enable row level security;

drop policy if exists "feed_likes public read" on public.feed_likes;
create policy "feed_likes public read" on public.feed_likes
  for select using (true);

drop policy if exists "feed_likes self write" on public.feed_likes;
create policy "feed_likes self write" on public.feed_likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "feed_likes self delete" on public.feed_likes;
create policy "feed_likes self delete" on public.feed_likes
  for delete using (auth.uid() = user_id);

-- Keep post.like_count accurate via triggers.
create or replace function public.feed_likes_bump()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update public.feed_posts set like_count = like_count + 1 where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.feed_posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists feed_likes_bump_ins on public.feed_likes;
create trigger feed_likes_bump_ins after insert on public.feed_likes
  for each row execute function public.feed_likes_bump();
drop trigger if exists feed_likes_bump_del on public.feed_likes;
create trigger feed_likes_bump_del after delete on public.feed_likes
  for each row execute function public.feed_likes_bump();

-- ── Comments ──────────────────────────────────────────────────────
create table if not exists public.feed_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.feed_posts on delete cascade,
  author_id  uuid not null references auth.users on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists feed_comments_post_time_idx
  on public.feed_comments(post_id, created_at);

alter table public.feed_comments enable row level security;

drop policy if exists "feed_comments public read" on public.feed_comments;
create policy "feed_comments public read" on public.feed_comments
  for select using (true);

drop policy if exists "feed_comments author write" on public.feed_comments;
create policy "feed_comments author write" on public.feed_comments
  for insert with check (auth.uid() = author_id);

drop policy if exists "feed_comments author delete" on public.feed_comments;
create policy "feed_comments author delete" on public.feed_comments
  for delete using (auth.uid() = author_id);

create or replace function public.feed_comments_bump()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update public.feed_posts set comment_count = comment_count + 1 where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.feed_posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists feed_comments_bump_ins on public.feed_comments;
create trigger feed_comments_bump_ins after insert on public.feed_comments
  for each row execute function public.feed_comments_bump();
drop trigger if exists feed_comments_bump_del on public.feed_comments;
create trigger feed_comments_bump_del after delete on public.feed_comments
  for each row execute function public.feed_comments_bump();

-- End of 0016_social_feed.sql
