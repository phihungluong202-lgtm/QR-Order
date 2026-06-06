# Database schema

## Recommended (new projects)

Run in Supabase SQL Editor **in order**:

1. `migrations/20250605000000_complete_schema.sql`
2. `migrations/20250605000001_complete_seed.sql`

## Tables

| Table | Purpose |
|-------|---------|
| `restaurants` | Tenant / brand |
| `tables` | QR table targets |
| `categories` | Menu sections |
| `menu_items` | Dishes |
| `orders` | Customer orders |
| `order_items` | Line items |
| `admin_users` | Staff (links `auth.users`) |

## Features

- Foreign keys + indexes for kitchen queue & menu lookups
- `updated_at` triggers on mutable tables
- `deleted_at` soft delete on catalog + orders
- RLS: public menu read + order place; staff scoped by `admin_users`
- Realtime on `orders` and `order_items`

## Legacy migrations

Older files `20250603*` / `20250604*` use `menu_categories` and `staff_profiles`.
The complete schema adds **compatibility views** `menu_categories` and `staff_profiles`
so existing app code keeps working during migration.
