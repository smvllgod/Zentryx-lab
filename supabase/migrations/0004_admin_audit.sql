-- Zentryx Lab — admin audit log
-- Records every admin mutation so we can answer "who changed what, when"
-- and, if needed, revert.

create table if not exists public.admin_actions (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid not null references auth.users on delete set null,
  actor_email text,
  action      text not null,                  -- e.g. "user.suspend", "user.plan_change", "block.override"
  target_type text not null,                  -- "user" | "subscription" | "listing" | "block" | "flag" | "setting"
  target_id   text,                           -- uuid / slug / block_id
  before      jsonb,
  after       jsonb,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists admin_actions_actor_idx  on public.admin_actions(actor_id, created_at desc);
create index if not exists admin_actions_target_idx on public.admin_actions(target_type, target_id);
create index if not exists admin_actions_created_idx on public.admin_actions(created_at desc);

alter table public.admin_actions enable row level security;

drop policy if exists "admin_actions admin all" on public.admin_actions;
create policy "admin_actions admin all"
  on public.admin_actions for all
  using (public.is_admin())
  with check (public.is_admin());
