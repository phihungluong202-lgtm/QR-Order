-- Demo restaurant seed (IDs match src/lib/constants.ts)

insert into public.restaurants (id, name, slug, currency)
values (
  '00000000-0000-0000-0000-000000000001',
  'Demo Bistro',
  'demo',
  'USD'
)
on conflict (slug) do update set name = excluded.name;

insert into public.tables (id, restaurant_id, label, qr_code, is_active)
values
  (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    '1',
    'table-1',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000001',
    '2',
    'table-2',
    true
  )
on conflict (restaurant_id, qr_code) do nothing;

insert into public.menu_categories (id, restaurant_id, name, sort_order, is_active)
values
  (
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000001',
    'Starters',
    0,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000022',
    '00000000-0000-0000-0000-000000000001',
    'Mains',
    1,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000023',
    '00000000-0000-0000-0000-000000000001',
    'Drinks',
    2,
    true
  )
on conflict (id) do nothing;

insert into public.menu_items (
  id,
  restaurant_id,
  category_id,
  name,
  description,
  price,
  is_available,
  sort_order
)
values
  (
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000021',
    'Crispy Spring Rolls',
    'Vegetable rolls with sweet chili dip',
    6.50,
    true,
    0
  ),
  (
    '00000000-0000-0000-0000-000000000032',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000021',
    'Tom Yum Soup',
    'Spicy, sour, aromatic',
    8.00,
    true,
    1
  ),
  (
    '00000000-0000-0000-0000-000000000033',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000022',
    'Pad Thai',
    'Classic stir-fried rice noodles',
    14.00,
    true,
    0
  ),
  (
    '00000000-0000-0000-0000-000000000034',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000022',
    'Green Curry',
    'Coconut curry with jasmine rice',
    15.50,
    true,
    1
  ),
  (
    '00000000-0000-0000-0000-000000000035',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000023',
    'Thai Iced Tea',
    'Sweet and creamy',
    4.50,
    true,
    0
  )
on conflict (id) do nothing;
