# Zentryx Lab — Admin dashboard setup

## 1. Apply the migration

Run `supabase/migrations/0002_admin.sql` in the Supabase SQL editor (or via `supabase db push`). It:

- Adds `user_role` enum + `profiles.role` + `profiles.suspended` columns
- Creates `public.is_admin()` security-definer function
- Adds admin-scoped RLS policies on existing tables
- Creates `block_registry_overrides`, `block_usage_events`, `feature_flags`, `system_settings`, `system_errors`, `listing_flags`
- Creates `block_analytics` + `mrr_snapshot` views

Safe to re-run (uses `create table if not exists`, `do/exception` blocks, `drop policy if exists`).

## 2. Promote your account

After signing up, promote the user to admin:

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

Roles: `user` (default), `staff`, `admin`. Both staff and admin see the dashboard; both are accepted by `is_admin()`.

## 3. Open the dashboard

Visit `/admin`. Non-admins are redirected to `/overview`.

## 4. What each page does

| Route                        | Purpose                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| `/admin`                     | Overview: users, subs, MRR, exports, top blocks, top creators, recent errors.                |
| `/admin/users`               | Paginated user list. Filter by plan. Suspend / reactivate; change plan inline.               |
| `/admin/users/[id]`          | Per-user detail — profile, subscriptions, strategies, exports. Change role / plan / suspend. |
| `/admin/subscriptions`       | Plan distribution + failed-payment view. Manual status override.                             |
| `/admin/strategies`          | Every strategy across all users. Filter + search. Owner link.                                |
| `/admin/blocks`              | Registry + usage heatmap. Edit plan / status / visibility per block.                         |
| `/admin/exports`             | Export history with 24h / 7d counters.                                                       |
| `/admin/marketplace`         | Listings moderation. Resolve open flags. Change listing status.                              |
| `/admin/creators`            | Top creators, listing conversion, gross revenue. Payout-ready placeholder.                   |
| `/admin/flags`               | Global feature flags. Links to per-block control.                                            |
| `/admin/settings`            | Maintenance mode, announcement banner, pricing, licensing defaults.                          |

## 5. Writing usage events

The builder should call `logBlockUsage(blockId, strategyId)` from `lib/blocks/usage.ts` whenever a node is added. The `block_analytics` view then populates the top-blocks panel automatically.

## 6. Pending wiring (expected follow-ups)

- Hook `logBlockUsage` into the builder's `addNodeFromDef` (one line).
- Read `system_settings.announcement` in the `AppShell` to show a banner to all users.
- Connect the `block_registry_overrides` table to `lib/blocks/registry.ts` so the admin's status / plan / hidden toggles take effect in the builder on next render (a small `applyOverrides(registry, overrides)` helper).
- Add Stripe webhook → `subscriptions` sync (not admin-owned code, but powers every number on `/admin/subscriptions`).
- Paginate tables over ~500 rows.

None of these block shipping — they're polish passes for V1.1.
