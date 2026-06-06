-- =============================================================================
-- QR Order — Complete restaurant schema (production-ready)
-- Run on a fresh Supabase project, OR after legacy 20250603* (ALTER adds missing columns).
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.order_status as enum (
    'pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.admin_role as enum ('admin', 'kitchen', 'waiter');
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- Utilities
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- restaurants (tenant root)
-- -----------------------------------------------------------------------------
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  logo_url text,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint restaurants_slug_unique unique (slug)
);

alter table public.restaurants
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

create index if not exists restaurants_slug_active_idx
  on public.restaurants (slug)
  where deleted_at is null;

drop trigger if exists restaurants_set_updated_at on public.restaurants;
create trigger restaurants_set_updated_at
  before update on public.restaurants
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- tables (dining tables / QR targets)
-- -----------------------------------------------------------------------------
create table if not exists public.tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  label text not null,
  qr_code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint tables_restaurant_qr_unique unique (restaurant_id, qr_code)
);

alter table public.tables
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

create index if not exists tables_restaurant_active_idx
  on public.tables (restaurant_id)
  where deleted_at is null and is_active = true;

create index if not exists tables_qr_lookup_idx
  on public.tables (restaurant_id, qr_code)
  where deleted_at is null;

drop trigger if exists tables_set_updated_at on public.tables;
create trigger tables_set_updated_at
  before update on public.tables
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- categories
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.categories
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

-- Copy legacy menu_categories rows (same ids) so app can read public.categories
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'menu_categories'
  ) then
    insert into public.categories (id, restaurant_id, name, sort_order, is_active)
    select id, restaurant_id, name, sort_order, is_active
    from public.menu_categories
    on conflict (id) do update
    set
      name = excluded.name,
      sort_order = excluded.sort_order,
      is_active = excluded.is_active,
      deleted_at = null;
  end if;
end $$;

create index if not exists categories_restaurant_menu_idx
  on public.categories (restaurant_id, sort_order)
  where deleted_at is null and is_active = true;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- menu_items
-- -----------------------------------------------------------------------------
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.menu_items
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

create index if not exists menu_items_category_idx
  on public.menu_items (category_id, sort_order)
  where deleted_at is null and is_available = true;

create index if not exists menu_items_restaurant_idx
  on public.menu_items (restaurant_id)
  where deleted_at is null;

drop trigger if exists menu_items_set_updated_at on public.menu_items;
create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- orders
-- -----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_id uuid not null references public.tables (id) on delete restrict,
  status public.order_status not null default 'pending',
  notes text,
  total numeric(10, 2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.orders
  add column if not exists deleted_at timestamptz;

create index if not exists orders_kitchen_queue_idx
  on public.orders (restaurant_id, status, created_at desc)
  where deleted_at is null
    and status not in ('served', 'cancelled');

create index if not exists orders_restaurant_created_idx
  on public.orders (restaurant_id, created_at desc)
  where deleted_at is null;

create index if not exists orders_table_idx
  on public.orders (table_id, created_at desc)
  where deleted_at is null;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- order_items
-- -----------------------------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id) on delete restrict,
  quantity int not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.order_items
  add column if not exists created_at timestamptz not null default now();

create index if not exists order_items_order_idx
  on public.order_items (order_id);

create index if not exists order_items_menu_item_idx
  on public.order_items (menu_item_id);

-- -----------------------------------------------------------------------------
-- admin_users (staff — linked to Supabase Auth)
-- -----------------------------------------------------------------------------
create table if not exists public.admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  email text not null,
  role public.admin_role not null default 'waiter',
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.admin_users
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

create index if not exists admin_users_restaurant_idx
  on public.admin_users (restaurant_id)
  where deleted_at is null and is_active = true;

create unique index if not exists admin_users_email_active_idx
  on public.admin_users (lower(email))
  where deleted_at is null;

drop trigger if exists admin_users_set_updated_at on public.admin_users;
create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS helpers (require admin_users table)
-- -----------------------------------------------------------------------------
-- Returns restaurant_id for the authenticated admin user (null if guest/anon)
create or replace function public.current_admin_restaurant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select restaurant_id
  from public.admin_users
  where id = auth.uid()
    and deleted_at is null
    and is_active = true
  limit 1;
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where id = auth.uid()
      and deleted_at is null
      and is_active = true
  );
$$;

create or replace function public.admin_has_role(allowed public.admin_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where id = auth.uid()
      and deleted_at is null
      and is_active = true
      and role = any (allowed)
  );
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.restaurants enable row level security;
alter table public.tables enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.admin_users enable row level security;

-- Drop legacy policies if re-running
do $$ declare r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'restaurants', 'tables', 'categories', 'menu_items',
        'orders', 'order_items', 'admin_users',
        'menu_categories', 'staff_profiles'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- restaurants: public read active; admins manage own tenant
create policy "restaurants_public_read"
  on public.restaurants for select
  using (deleted_at is null);

create policy "restaurants_admin_all"
  on public.restaurants for all
  using (
    public.admin_has_role(array['admin']::public.admin_role[])
    and id = public.current_admin_restaurant_id()
  )
  with check (
    public.admin_has_role(array['admin']::public.admin_role[])
    and id = public.current_admin_restaurant_id()
  );

-- tables
create policy "tables_public_read"
  on public.tables for select
  using (deleted_at is null and is_active = true);

create policy "tables_admin_manage"
  on public.tables for all
  using (
    public.admin_has_role(array['admin']::public.admin_role[])
    and restaurant_id = public.current_admin_restaurant_id()
  )
  with check (
    public.admin_has_role(array['admin']::public.admin_role[])
    and restaurant_id = public.current_admin_restaurant_id()
  );

-- categories
create policy "categories_public_read"
  on public.categories for select
  using (deleted_at is null and is_active = true);

create policy "categories_admin_manage"
  on public.categories for all
  using (
    public.admin_has_role(array['admin']::public.admin_role[])
    and restaurant_id = public.current_admin_restaurant_id()
  )
  with check (
    public.admin_has_role(array['admin']::public.admin_role[])
    and restaurant_id = public.current_admin_restaurant_id()
  );

-- menu_items
create policy "menu_items_public_read"
  on public.menu_items for select
  using (deleted_at is null and is_available = true);

create policy "menu_items_admin_manage"
  on public.menu_items for all
  using (
    public.admin_has_role(array['admin']::public.admin_role[])
    and restaurant_id = public.current_admin_restaurant_id()
  )
  with check (
    public.admin_has_role(array['admin']::public.admin_role[])
    and restaurant_id = public.current_admin_restaurant_id()
  );

-- orders: guests create/read; staff update same restaurant
create policy "orders_public_insert"
  on public.orders for insert
  with check (deleted_at is null);

create policy "orders_public_select"
  on public.orders for select
  using (deleted_at is null);

create policy "orders_staff_select"
  on public.orders for select
  using (
    deleted_at is null
    and restaurant_id = public.current_admin_restaurant_id()
    and public.admin_has_role(array['admin', 'kitchen', 'waiter']::public.admin_role[])
  );

create policy "orders_staff_update"
  on public.orders for update
  using (
    deleted_at is null
    and restaurant_id = public.current_admin_restaurant_id()
    and public.admin_has_role(array['admin', 'kitchen', 'waiter']::public.admin_role[])
  )
  with check (
    deleted_at is null
    and restaurant_id = public.current_admin_restaurant_id()
  );

-- order_items
create policy "order_items_public_insert"
  on public.order_items for insert
  with check (true);

create policy "order_items_public_select"
  on public.order_items for select
  using (true);

create policy "order_items_staff_select"
  on public.order_items for select
  using (
    public.is_admin_user()
    and exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.restaurant_id = public.current_admin_restaurant_id()
        and o.deleted_at is null
    )
  );

-- admin_users
create policy "admin_users_read_self"
  on public.admin_users for select
  using (id = auth.uid() and deleted_at is null);

create policy "admin_users_admin_manage"
  on public.admin_users for all
  using (
    public.admin_has_role(array['admin']::public.admin_role[])
    and restaurant_id = public.current_admin_restaurant_id()
  )
  with check (
    public.admin_has_role(array['admin']::public.admin_role[])
    and restaurant_id = public.current_admin_restaurant_id()
  );

-- -----------------------------------------------------------------------------
-- Realtime (kitchen / waiter dashboards)
-- -----------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.order_items;
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- Compatibility views (only when legacy name is not already a base table)
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'menu_categories'
      and c.relkind in ('r', 'p')
  ) then
    execute $view$
      create or replace view public.menu_categories
      with (security_invoker = true)
      as
        select id, restaurant_id, name, sort_order, is_active
        from public.categories
        where deleted_at is null
    $view$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'staff_profiles'
      and c.relkind in ('r', 'p')
  ) then
    execute $view$
      create or replace view public.staff_profiles
      with (security_invoker = true)
      as
        select
          id,
          restaurant_id,
          role::text as role,
          display_name,
          created_at,
          updated_at
        from public.admin_users
        where deleted_at is null
    $view$;
  end if;
end $$;
