-- Zentryx Lab — forum post images
--
-- Users were asking for a "real feed where people can post with images".
-- Posts now carry an optional array of public image URLs stored in a
-- public `forum-images` bucket. Author uploads to a per-post prefix;
-- anyone reads.

alter table public.forum_posts
  add column if not exists image_urls text[] not null default '{}';

-- Bucket with a 5 MB per-file cap.
insert into storage.buckets (id, name, public, file_size_limit)
  values ('forum-images', 'forum-images', true, 5242880)
on conflict (id) do update set public = true, file_size_limit = 5242880;

-- Anyone can read.
drop policy if exists "forum-images public read" on storage.objects;
create policy "forum-images public read"
  on storage.objects for select
  using (bucket_id = 'forum-images');

-- Authenticated users can upload to their own prefix `<user_id>/...`.
-- The upload UI scopes paths under the author's uid so RLS is tight.
drop policy if exists "forum-images author upload" on storage.objects;
create policy "forum-images author upload"
  on storage.objects for insert
  with check (
    bucket_id = 'forum-images'
    and auth.uid() is not null
    and (string_to_array(storage.objects.name, '/'))[1] = auth.uid()::text
  );

drop policy if exists "forum-images author delete" on storage.objects;
create policy "forum-images author delete"
  on storage.objects for delete
  using (
    bucket_id = 'forum-images'
    and auth.uid() is not null
    and (string_to_array(storage.objects.name, '/'))[1] = auth.uid()::text
  );

-- End of 0013_forum_images.sql
