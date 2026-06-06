-- Staff profiles linked to Supabase Auth (admin / kitchen / waiter)

create type public.staff_role as enum ('admin', 'kitchen', 'waiter');

create table public.staff_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  role public.staff_role not null default 'waiter',
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index staff_profiles_restaurant_idx on public.staff_profiles (restaurant_id);

alter table public.staff_profiles enable row level security;

-- Staff can read their own profile
create policy "Staff read own profile"
  on public.staff_profiles for select
  using (auth.uid() = id);

-- Admins read all profiles in their restaurant
create policy "Admin read restaurant staff"
  on public.staff_profiles for select
  using (
    exists (
      select 1 from public.staff_profiles sp
      where sp.id = auth.uid()
        and sp.restaurant_id = staff_profiles.restaurant_id
        and sp.role = 'admin'
    )
  );

-- Admins manage staff in their restaurant
create policy "Admin manage restaurant staff"
  on public.staff_profiles for all
  using (
    exists (
      select 1 from public.staff_profiles sp
      where sp.id = auth.uid()
        and sp.restaurant_id = staff_profiles.restaurant_id
        and sp.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.staff_profiles sp
      where sp.id = auth.uid()
        and sp.restaurant_id = staff_profiles.restaurant_id
        and sp.role = 'admin'
    )
  );

-- Authenticated staff can update own row
create policy "Staff update own profile"
  on public.staff_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
