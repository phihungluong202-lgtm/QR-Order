-- QR Order initial schema
-- Enable RLS on all public tables

create extension if not exists "pgcrypto";

create type public.order_status as enum (
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'served',
  'cancelled'
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

create table public.tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  label text not null,
  qr_code text not null,
  is_active boolean not null default true,
  unique (restaurant_id, qr_code)
);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid not null references public.menu_categories (id) on delete cascade,
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  image_url text,
  is_available boolean not null default true,
  sort_order int not null default 0
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_id uuid not null references public.tables (id) on delete restrict,
  status public.order_status not null default 'pending',
  notes text,
  total numeric(10, 2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id) on delete restrict,
  quantity int not null check (quantity > 0),
  unit_price numeric(10, 2) not null,
  notes text
);

create index orders_restaurant_status_idx on public.orders (restaurant_id, status);
create index orders_created_at_idx on public.orders (created_at desc);

alter table public.restaurants enable row level security;
alter table public.tables enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Public read for customer menu & table resolve (tighten in production with auth)
create policy "Public read restaurants"
  on public.restaurants for select using (true);

create policy "Public read active tables"
  on public.tables for select using (is_active = true);

create policy "Public read active categories"
  on public.menu_categories for select using (is_active = true);

create policy "Public read available items"
  on public.menu_items for select using (is_available = true);

create policy "Anyone can insert orders"
  on public.orders for insert with check (true);

create policy "Anyone can read orders"
  on public.orders for select using (true);

create policy "Anyone can update orders"
  on public.orders for update using (true) with check (true);

create policy "Anyone can insert order items"
  on public.order_items for insert with check (true);

create policy "Anyone can read order items"
  on public.order_items for select using (true);

-- Realtime
alter publication supabase_realtime add table public.orders;
