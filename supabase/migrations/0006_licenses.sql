-- Zentryx Lab — license system migration
-- Adds: licenses (issued keys), license_activations (runtime check log),
-- exports.license_id (tracks which license was baked into each export).
--
-- Design notes:
-- • Plaintext keys are shown to the issuer exactly once; only the SHA-256
--   hash is stored in `licenses.key_hash`. Matching is done via hash lookup.
-- • Activations are logged even for invalid keys (for abuse monitoring).
--   The `license_id` FK is nullable because invalid keys have no record.
-- • Creators own the licenses they issue (user_id). Buyers can read the
--   licenses issued to them (buyer_id). Admins see everything.
-- • The license-check endpoint runs with the service role and bypasses
--   RLS — it does its own authorization based on the key itself.

-- ────────────────────────────────────────────────────────────────────
-- Enum: license check results (used by license_activations.result and
-- returned by the license-check edge function).
-- ────────────────────────────────────────────────────────────────────
do $$ begin
  create type license_result as enum (
    'valid',
    'invalid_key',
    'expired',
    'revoked',
    'wrong_account',
    'wrong_broker',
    'max_activations',
    'grace',
    'rate_limited',
    'malformed'
  );
exception when duplicate_object then null; end $$;

-- ────────────────────────────────────────────────────────────────────
-- licenses
-- ────────────────────────────────────────────────────────────────────
create table if not exists public.licenses (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users on delete cascade,
  strategy_id      uuid references public.strategies on delete set null,
  listing_id       uuid references public.marketplace_listings on delete set null,
  purchase_id      uuid references public.purchases on delete set null,
  buyer_id         uuid references auth.users on delete set null,
  buyer_email      text,

  -- Key storage. Plaintext is never persisted.
  key_hash         text not null unique,
  key_prefix       text not null,                  -- first 9 chars, e.g. "ZNTX-A7K2"

  -- Binding / constraints (null = no constraint)
  bound_account    bigint,                         -- MT5 ACCOUNT_LOGIN
  bound_broker     text,                           -- substring match on ACCOUNT_COMPANY
  bound_server     text,                           -- substring match on ACCOUNT_SERVER
  expires_at       timestamptz,
  max_activations  integer,                        -- null = unlimited

  -- Revocation
  revoked          boolean not null default false,
  revoked_at       timestamptz,
  revoke_reason    text,

  -- Creator-facing metadata
  label            text,                           -- e.g. "Manual — alice@acme.com"
  metadata         jsonb not null default '{}'::jsonb,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists licenses_user_idx       on public.licenses(user_id);
create index if not exists licenses_buyer_idx      on public.licenses(buyer_id);
create index if not exists licenses_strategy_idx   on public.licenses(strategy_id);
create index if not exists licenses_listing_idx    on public.licenses(listing_id);
create index if not exists licenses_purchase_idx   on public.licenses(purchase_id);
create index if not exists licenses_key_hash_idx   on public.licenses(key_hash);
create index if not exists licenses_revoked_idx    on public.licenses(revoked) where revoked = false;

drop trigger if exists licenses_updated_at on public.licenses;
create trigger licenses_updated_at before update on public.licenses
  for each row execute function public.set_updated_at();

alter table public.licenses enable row level security;

-- Owner (creator) has full access to licenses they issued.
drop policy if exists "licenses owner all" on public.licenses;
create policy "licenses owner all" on public.licenses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Buyer can read licenses issued to them.
drop policy if exists "licenses buyer read" on public.licenses;
create policy "licenses buyer read" on public.licenses for select
  using (auth.uid() = buyer_id);

-- Admin read/write.
drop policy if exists "licenses admin all" on public.licenses;
create policy "licenses admin all" on public.licenses for all
  using (public.is_admin()) with check (public.is_admin());

-- ────────────────────────────────────────────────────────────────────
-- license_activations  (runtime check log)
-- ────────────────────────────────────────────────────────────────────
-- Every call to /.netlify/functions/license-check inserts one row, even
-- if the key is invalid. Used for: usage counting, abuse detection,
-- admin audit, grace-mode fallback.
create table if not exists public.license_activations (
  id                uuid primary key default gen_random_uuid(),
  license_id        uuid references public.licenses on delete set null,
  key_hash          text not null,                 -- always recorded
  account_login     bigint,
  broker            text,
  server            text,
  terminal_company  text,
  client_ip         text,
  country           text,
  user_agent        text,
  result            license_result not null,
  created_at        timestamptz not null default now()
);

create index if not exists activations_license_idx   on public.license_activations(license_id);
create index if not exists activations_result_idx    on public.license_activations(result);
create index if not exists activations_created_idx   on public.license_activations(created_at desc);
create index if not exists activations_key_hash_idx  on public.license_activations(key_hash);

alter table public.license_activations enable row level security;

-- Owner of the license can read its activations.
drop policy if exists "activations owner read" on public.license_activations;
create policy "activations owner read" on public.license_activations for select
  using (
    license_id is not null
    and exists (
      select 1 from public.licenses l
      where l.id = license_activations.license_id
        and l.user_id = auth.uid()
    )
  );

-- Admin read.
drop policy if exists "activations admin read" on public.license_activations;
create policy "activations admin read" on public.license_activations for select
  using (public.is_admin());

-- Inserts happen only via the service role (edge function). No client policy.

-- ────────────────────────────────────────────────────────────────────
-- exports.license_id  (tracks which license was baked into an export)
-- ────────────────────────────────────────────────────────────────────
alter table public.exports
  add column if not exists license_id uuid references public.licenses on delete set null;

create index if not exists exports_license_idx on public.exports(license_id);

-- ────────────────────────────────────────────────────────────────────
-- purchases.license_id  (tracks license auto-issued at purchase)
-- ────────────────────────────────────────────────────────────────────
alter table public.purchases
  add column if not exists license_id uuid references public.licenses on delete set null;

create index if not exists purchases_license_idx on public.purchases(license_id);

-- ────────────────────────────────────────────────────────────────────
-- Aggregate view — per-license usage count (for the creator dashboard)
-- ────────────────────────────────────────────────────────────────────
create or replace view public.license_usage as
  select
    license_id,
    count(*) filter (where result = 'valid')::int                 as valid_checks,
    count(*) filter (where result <> 'valid')::int                as failed_checks,
    count(distinct account_login) filter (where result = 'valid') as unique_accounts,
    max(created_at)                                               as last_checked_at,
    max(created_at) filter (where result = 'valid')               as last_valid_at
  from public.license_activations
  where license_id is not null
  group by license_id;

-- ────────────────────────────────────────────────────────────────────
-- Admin action enum — extend with license events (documented; actual
-- enum is text on admin_actions so no type change needed).
-- See lib/admin/queries.ts AdminAction type for the TS side.
-- ────────────────────────────────────────────────────────────────────
-- "license.issue", "license.revoke", "license.update" — added in code.

-- ────────────────────────────────────────────────────────────────────
-- Grace-mode and server URL defaults are already seeded in 0002_admin.sql:
--   system_settings.licensing_defaults = {"grace_mode": true, "server": ...}
-- The license-check edge function reads from Supabase and publishes its
-- own URL; nothing to seed here.
-- ────────────────────────────────────────────────────────────────────

-- End of 0006_licenses.sql
