-- Zentryx Lab — announcements are admin-only
--
-- Adds two guarantees:
--  1. The `announcements` category can only receive posts from admin
--     accounts. Non-admin inserts raise an exception at the trigger
--     level, so client-side bypass attempts still fail.
--  2. Announcement posts skip the pending queue: when an admin writes
--     an announcement, it is auto-approved on insert.
--
-- A `category_admin_only` flag on `forum_categories` makes the rule
-- data-driven so future gated categories can reuse the same trigger.

alter table public.forum_categories
  add column if not exists admin_only boolean not null default false;

update public.forum_categories set admin_only = true where slug = 'announcements';

create or replace function public.forum_posts_guard_category()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _admin_only boolean;
begin
  select admin_only into _admin_only
    from public.forum_categories
   where slug = new.category_slug;

  if _admin_only and not public.is_admin() then
    raise exception 'Only admins can post to the % category.', new.category_slug;
  end if;

  -- Auto-approve admin posts so they skip the moderation queue entirely.
  if _admin_only and public.is_admin() then
    new.status := 'approved';
    new.approved_at := now();
    new.approved_by := auth.uid();
  end if;

  return new;
end $$;

drop trigger if exists forum_posts_category_guard on public.forum_posts;
create trigger forum_posts_category_guard
  before insert on public.forum_posts
  for each row execute function public.forum_posts_guard_category();

-- End of 0017_forum_announcements_admin_only.sql
