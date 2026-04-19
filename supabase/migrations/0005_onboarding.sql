-- Zentryx Lab — onboarding profile columns
-- Personalises the first-run experience. All fields are nullable —
-- user can skip every step. `onboarded` = true once they've been
-- shown the flow (skipped or completed).

alter table public.profiles
  add column if not exists onboarded         boolean        not null default false,
  add column if not exists trading_level     text,                         -- beginner | intermediate | advanced | pro
  add column if not exists markets           text[]         not null default '{}',  -- forex, metals, indices, crypto, stocks
  add column if not exists broker            text,                         -- free text
  add column if not exists mt5_platform      text,                         -- mt5 | mt4 | none
  add column if not exists trading_styles    text[]         not null default '{}',  -- trend, breakout, reversal, scalp, grid
  add column if not exists goal              text,                         -- learn | ship-ea | sell-marketplace | prop-firm
  add column if not exists account_size      text,                         -- <1k | 1k-10k | 10k-50k | 50k-250k | 250k+
  add column if not exists referral_source   text,                         -- twitter | youtube | friend | search | other
  add column if not exists onboarded_at      timestamptz;

-- Index unused columns away from queries. Just a marker comment.
comment on column public.profiles.onboarded is 'Set true after the user completes or skips the onboarding wizard.';
