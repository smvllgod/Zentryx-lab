-- Zentryx Lab — marketplace listing images + review aggregation
-- Adds a presentation image (hero) + a gallery of screenshots / backtests
-- per listing, plus a trigger that keeps `listings.rating` in sync with
-- the mean of approved reviews.

-- ────────────────────────────────────────────────────────────────────
-- Columns
-- ────────────────────────────────────────────────────────────────────
alter table public.marketplace_listings
  add column if not exists presentation_image_url text,
  add column if not exists gallery_urls           text[] not null default '{}',
  add column if not exists rating_count           integer not null default 0;

comment on column public.marketplace_listings.presentation_image_url
  is 'Hero image shown on listing cards and top of the detail page.';
comment on column public.marketplace_listings.gallery_urls
  is 'Up to ~8 secondary screenshots (backtests, chart panels, results).';

-- ────────────────────────────────────────────────────────────────────
-- Review-aggregation trigger
-- ────────────────────────────────────────────────────────────────────
-- Recomputes (mean-rating, review-count) for a listing whenever a
-- review is created / updated / deleted. Keeps the listing-card badge
-- always-fresh without needing a nightly job.

create or replace function public.mp_recalc_listing_rating(_listing uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _avg numeric;
  _cnt integer;
begin
  select coalesce(round(avg(rating)::numeric, 2), 0)::numeric(3,2),
         count(*)
    into _avg, _cnt
    from public.reviews
   where listing_id = _listing;

  update public.marketplace_listings
     set rating       = case when _cnt = 0 then null else _avg end,
         rating_count = _cnt
   where id = _listing;
end $$;

create or replace function public.mp_reviews_recalc_trigger()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'DELETE') then
    perform public.mp_recalc_listing_rating(old.listing_id);
    return old;
  else
    perform public.mp_recalc_listing_rating(new.listing_id);
    return new;
  end if;
end $$;

drop trigger if exists reviews_recalc_after_write on public.reviews;
create trigger reviews_recalc_after_write
  after insert or update or delete on public.reviews
  for each row execute function public.mp_reviews_recalc_trigger();

-- ────────────────────────────────────────────────────────────────────
-- Tighten reviews policy: only buyers may write reviews
-- ────────────────────────────────────────────────────────────────────
-- A user may review a listing only once, and only if they have a
-- `paid` purchase for it. Read is still public.

alter table public.reviews
  add column if not exists purchase_id uuid references public.purchases on delete set null;

create unique index if not exists reviews_unique_author_listing
  on public.reviews(listing_id, author_id);

drop policy if exists "reviews author write" on public.reviews;
drop policy if exists "reviews buyer write" on public.reviews;
create policy "reviews buyer write"
  on public.reviews for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.purchases p
       where p.listing_id = reviews.listing_id
         and p.buyer_id   = auth.uid()
         and p.status     = 'paid'
    )
  );

drop policy if exists "reviews author update" on public.reviews;
create policy "reviews author update"
  on public.reviews for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "reviews author delete" on public.reviews;
create policy "reviews author delete"
  on public.reviews for delete
  using (auth.uid() = author_id);

-- ────────────────────────────────────────────────────────────────────
-- Storage bucket for listing images
-- ────────────────────────────────────────────────────────────────────
-- One public bucket; uploads scoped to the listing author.
insert into storage.buckets (id, name, public, file_size_limit)
  values ('listing-images', 'listing-images', true, 5242880)   -- 5 MB cap
on conflict (id) do update set public = true, file_size_limit = 5242880;

-- Authors may write to their own prefix `<listing_id>/*`; anyone may read.
drop policy if exists "listing-images public read" on storage.objects;
create policy "listing-images public read"
  on storage.objects for select
  using (bucket_id = 'listing-images');

drop policy if exists "listing-images author write" on storage.objects;
create policy "listing-images author write"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-images'
    and auth.uid() is not null
    and exists (
      select 1 from public.marketplace_listings l
       where l.id = (string_to_array(storage.objects.name, '/'))[1]::uuid
         and l.author_id = auth.uid()
    )
  );

drop policy if exists "listing-images author delete" on storage.objects;
create policy "listing-images author delete"
  on storage.objects for delete
  using (
    bucket_id = 'listing-images'
    and auth.uid() is not null
    and exists (
      select 1 from public.marketplace_listings l
       where l.id = (string_to_array(storage.objects.name, '/'))[1]::uuid
         and l.author_id = auth.uid()
    )
  );

-- End of 0007_listing_images.sql
