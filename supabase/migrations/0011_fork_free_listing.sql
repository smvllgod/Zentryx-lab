-- Zentryx Lab — forkable free listings
-- Lets a signed-in user copy the strategy graph of a FREE, PUBLISHED
-- marketplace listing into a new strategy they own. Paid listings
-- deliberately cannot be forked — we don't want to undermine creators
-- who priced their work.
--
-- Implementation: a SECURITY DEFINER function that re-checks the
-- listing is free + published inside the function body. Callable by
-- any authenticated user; performs the insert server-side so the
-- caller never sees the seller's underlying strategies row.

create or replace function public.fork_free_listing(_listing_id uuid, _new_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _graph   jsonb;
  _author  uuid;
  _price   integer;
  _status  listing_status;
  _caller  uuid := auth.uid();
  _new_id  uuid;
begin
  if _caller is null then
    raise exception 'not authenticated';
  end if;

  select s.graph, l.author_id, l.price_cents, l.status
    into _graph, _author, _price, _status
    from public.marketplace_listings l
    join public.strategies s on s.id = l.strategy_id
   where l.id = _listing_id;

  if _graph is null then
    raise exception 'listing not found';
  end if;

  if _status <> 'published' then
    raise exception 'listing not published';
  end if;

  if _price > 0 then
    raise exception 'paid listings cannot be forked';
  end if;

  insert into public.strategies (user_id, name, graph, status, description, tags)
  values (
    _caller,
    coalesce(nullif(trim(_new_name), ''), 'Forked strategy'),
    _graph,
    'draft',
    'Forked from a free marketplace listing.',
    array['forked']
  )
  returning id into _new_id;

  return _new_id;
end $$;

revoke all on function public.fork_free_listing(uuid, text) from public;
grant execute on function public.fork_free_listing(uuid, text) to authenticated;

-- End of 0011_fork_free_listing.sql
