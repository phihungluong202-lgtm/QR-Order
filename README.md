# QR Order

Production-ready restaurant QR table ordering — Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Supabase, Zustand, React Query, and PWA support.

## Features

- **Customer** — Scan table QR → browse menu → cart → checkout
- **Kitchen** — Realtime order queue (Supabase Realtime)
- **Waiter** — Mark ready orders as served
- **Admin** — Menu, tables, and QR management (scaffolded)

## Quick start

```bash
cp .env.example .env.local
# Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (optional for demo mode)

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Demo flow (no Supabase):**

1. Home → Customer or visit `/t/demo/table-1`
2. Add items → Cart → Checkout
3. Kitchen `/kitchen` shows orders in memory; use status buttons

## Project structure

```
src/
├── api/              # React Query fetchers & query keys
├── app/
│   ├── (customer)/   # Menu, cart, checkout + bottom nav
│   ├── (dashboard)/  # Admin & kitchen layouts
│   ├── api/          # Route handlers (menu, orders, tables)
│   └── t/[restaurant]/[table]/  # QR entry
├── components/
│   ├── layout/       # Shells, nav, empty states
│   ├── menu/
│   └── ui/           # shadcn-style primitives
├── hooks/
├── lib/              # Supabase, env, demo data, utils
├── providers/
├── stores/           # Zustand cart
└── types/
supabase/migrations/  # Postgres schema + RLS
public/               # PWA manifest & icons
```

## Supabase setup

**Hướng dẫn chi tiết (tiếng Việt):** [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

1. Tạo project trên [supabase.com](https://supabase.com)
2. Chạy 2 file SQL trong `supabase/migrations/`
3. Điền URL + anon key vào `.env.local`
4. `npm run dev` → kiểm tra http://localhost:3000/api/health/supabase
5. `npm run supabase:check` (tùy chọn, từ terminal)

## PWA (iOS & Android)

- `manifest.webmanifest` + Serwist service worker (production builds)
- Add PNG icons under `public/icons/` (192×192, 512×512)
- iOS: Safari → Share → Add to Home Screen
- Android: Chrome install prompt when criteria are met

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build + SW |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Environment variables

See `.env.example`.

## License

MIT
