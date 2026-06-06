# QR Order — Production Deployment Guide

> Last updated: June 2026  
> Stack: Next.js 15 · Supabase · Vercel · Serwist PWA

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Supabase Setup](#2-supabase-setup)
3. [Environment Variables](#3-environment-variables)
4. [Deploy to Vercel](#4-deploy-to-vercel)
5. [Custom Domain & DNS](#5-custom-domain--dns)
6. [Post-Deployment Checklist](#6-post-deployment-checklist)
7. [Recommended Supabase Settings](#7-recommended-supabase-settings)
8. [Backup Strategy](#8-backup-strategy)
9. [Monitoring & Error Logging](#9-monitoring--error-logging)
10. [Common Issues](#10-common-issues)

---

## 1. Prerequisites

| Tool | Minimum version | Notes |
|------|----------------|-------|
| Node.js | 20 LTS | `node -v` to check |
| npm | 10+ | bundled with Node 20 |
| Git | any | for Vercel git integration |
| Supabase account | — | [supabase.com](https://supabase.com) |
| Vercel account | — | [vercel.com](https://vercel.com) |

---

## 2. Supabase Setup

### 2.1 Create a project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Choose a region close to your users (e.g. **Southeast Asia** for Vietnam)
3. Note down the **Project URL** and **anon key** (Settings → API)

### 2.2 Run the database migrations

Open the **SQL Editor** in your Supabase project and run:

```sql
-- Tables
CREATE TABLE IF NOT EXISTS public.restaurants (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.menu_items (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  price         DECIMAL(10,2) NOT NULL,
  image_url     TEXT,
  is_available  BOOLEAN DEFAULT TRUE,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.tables (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_number  INT NOT NULL,
  name          TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id   UUID REFERENCES public.restaurants(id),
  table_id        UUID REFERENCES public.tables(id),
  status          TEXT CHECK (status IN ('pending','preparing','ready','completed','cancelled')) DEFAULT 'pending',
  notes           TEXT,
  total_amount    DECIMAL(10,2),
  idempotency_key TEXT UNIQUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id     UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id),
  quantity     INT NOT NULL CHECK (quantity > 0),
  unit_price   DECIMAL(10,2) NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update orders.updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### 2.3 Row Level Security (RLS)

Enable RLS and apply these policies. Run in the SQL Editor:

```sql
-- Enable RLS
ALTER TABLE public.restaurants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items     ENABLE ROW LEVEL SECURITY;

-- Public READ for menu data
CREATE POLICY "public read restaurants"  ON public.restaurants    FOR SELECT USING (true);
CREATE POLICY "public read categories"   ON public.categories     FOR SELECT USING (true);
CREATE POLICY "public read menu items"   ON public.menu_items     FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "public read tables"       ON public.tables         FOR SELECT USING (is_active = true);

-- Customers can INSERT orders (no auth required)
CREATE POLICY "public insert orders"     ON public.orders         FOR INSERT WITH CHECK (true);
CREATE POLICY "public insert order items" ON public.order_items   FOR INSERT WITH CHECK (true);

-- Customers can read their own orders (by order id in URL)
CREATE POLICY "public read orders"       ON public.orders         FOR SELECT USING (true);
CREATE POLICY "public read order items"  ON public.order_items    FOR SELECT USING (true);

-- Only service_role can UPDATE/DELETE (admin APIs use service role key)
-- No additional policies needed — service_role bypasses RLS by default.
```

### 2.4 Create the Storage bucket for menu images

```sql
-- Run in SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true);

-- Allow public reads
CREATE POLICY "public read menu images"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');

-- Allow authenticated uploads (admin)
CREATE POLICY "authenticated upload menu images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'menu-images' AND auth.role() = 'authenticated');
```

Or do it via the Supabase Dashboard → Storage → New bucket → name it `menu-images`, mark it **Public**.

### 2.5 Enable Realtime for orders

Dashboard → Database → Replication → toggle **orders** table ON for INSERT and UPDATE events.

---

## 3. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ prod | Server-only admin key — **never expose** |
| `NEXT_PUBLIC_APP_URL` | ✅ | Full URL with protocol, no trailing slash |
| `NEXT_PUBLIC_RESTAURANT_SLUG` | ✅ | Matches `restaurants.slug` in DB |
| `NEXT_PUBLIC_STORAGE_BUCKET` | optional | Defaults to `menu-images` |
| `NEXT_PUBLIC_SENTRY_DSN` | optional | For error tracking via Sentry |

> **Security**: `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS. Never prefix it with `NEXT_PUBLIC_`. It is only read in server-side route handlers.

---

## 4. Deploy to Vercel

### 4.1 One-click via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# From the project root
vercel

# Follow prompts: link to project, set scope, etc.
# For production:
vercel --prod
```

### 4.2 Via GitHub integration (recommended)

1. Push your code to a GitHub repository
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the repository
4. In **Environment Variables**, add all variables from step 3
5. Click **Deploy**

Vercel will automatically redeploy on every push to `main`.

### 4.3 Environment variable setup in Vercel dashboard

`Project Settings → Environment Variables → Add`:

- Set `SUPABASE_SERVICE_ROLE_KEY` for **Production** and **Preview** environments
- Set all `NEXT_PUBLIC_*` variables for all environments
- Change `NEXT_PUBLIC_APP_URL` to your production URL (e.g. `https://qrorder.vercel.app`)

### 4.4 Build settings (auto-detected)

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Build command | `npm run build` |
| Output directory | `.next` |
| Install command | `npm ci` |

---

## 5. Custom Domain & DNS

### 5.1 Add domain in Vercel

1. Project → Settings → Domains → Add your domain (e.g. `order.yourrestaurant.com`)
2. Vercel provides the DNS records to add

### 5.2 DNS records (at your registrar)

| Type | Name | Value |
|------|------|-------|
| `CNAME` | `order` | `cname.vercel-dns.com` |
| **or** `A` | `@` | `76.76.21.21` (Vercel IPv4) |
| **or** `AAAA` | `@` | `2606:4700:...` (Vercel IPv6) |

SSL is provisioned automatically (Let's Encrypt).

---

## 6. Post-Deployment Checklist

### 6.1 Functionality

- [ ] Home page loads without errors
- [ ] `/menu` shows real menu items from Supabase
- [ ] Scan a QR code → redirects to `/table/1` correctly
- [ ] Add items to cart, proceed to checkout, place order
- [ ] Order appears in `/kitchen` dashboard
- [ ] Change order status (Pending → Preparing → Ready)
- [ ] Admin login works at `/admin/login`
- [ ] `/admin/menu` — create, edit, delete a menu item with image upload
- [ ] `/admin/tables` — generate and download a QR PNG
- [ ] `/admin/tables/print` — print all QR codes

### 6.2 Performance

- [ ] Run [PageSpeed Insights](https://pagespeed.web.dev) on your production URL
- [ ] LCP < 2.5s on mobile (4G)
- [ ] No CLS > 0.1
- [ ] PWA install prompt appears on mobile

### 6.3 Security

- [ ] Open browser DevTools → Network → confirm `Strict-Transport-Security` header present
- [ ] `X-Frame-Options: SAMEORIGIN` present
- [ ] `X-Content-Type-Options: nosniff` present
- [ ] `.env.local` is in `.gitignore` — run `git status` to confirm it's NOT tracked
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is NOT in `NEXT_PUBLIC_*` variables
- [ ] Verify Supabase RLS: Open an incognito window and try `DELETE` on the orders table via the API — it should be blocked

### 6.4 SEO & Meta

- [ ] Check `https://your-domain/robots.txt` — admin/API paths are disallowed
- [ ] Check `https://your-domain/sitemap.xml` — menu and home pages are listed
- [ ] Paste your URL into [opengraph.xyz](https://www.opengraph.xyz) to verify OG tags
- [ ] `<title>` is correct on the menu page

### 6.5 PWA

- [ ] Visit on mobile Chrome → "Add to Home Screen" prompt appears
- [ ] Installed PWA opens in standalone mode (no browser chrome)
- [ ] Offline fallback works (turn on Airplane mode after loading once)

---

## 7. Recommended Supabase Settings

### 7.1 Auth (for admin login)

Dashboard → Authentication → Settings:

| Setting | Recommended |
|---------|-------------|
| Site URL | `https://your-domain.com` |
| Redirect URLs | `https://your-domain.com/**` |
| Email confirmations | Enable in production |
| JWT Expiry | `3600` (1 hour) — lower = more secure |
| Refresh token rotation | **Enabled** |
| Refresh token reuse interval | `10` seconds |

### 7.2 Database

Dashboard → Database → Settings:

| Setting | Recommended |
|---------|-------------|
| Connection pooling | **Enabled** (Transaction mode for serverless) |
| Pool size | `15` (default for free tier) |
| SSL mode | `require` |

Run the following to tune performance for small restaurants:

```sql
-- Speed up order lookups
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status
  ON public.orders (restaurant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_table
  ON public.orders (table_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_menu_items_category
  ON public.menu_items (category_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_order
  ON public.order_items (order_id);
```

### 7.3 Storage

Dashboard → Storage → Policies:

- Bucket `menu-images`: **Public bucket** ✅
- CORS: Allow `https://your-domain.com` (or `*` for simplicity)

### 7.4 Realtime

Dashboard → Database → Replication:

- Enable `orders` table → INSERT + UPDATE
- Enable `order_items` table → INSERT (optional, for kitchen detail view)

---

## 8. Backup Strategy

### 8.1 Automated Supabase backups

Supabase Pro plan includes daily point-in-time recovery (PITR). On the free tier:

- Backups are retained for **7 days** (no PITR)
- Dashboard → Settings → Backups to view and restore

### 8.2 Manual backup (recommended weekly)

```bash
# Export all tables as JSON using Supabase CLI
supabase db dump --linked -f backup-$(date +%Y%m%d).sql

# Or via psql (get the connection string from Dashboard → Settings → Database)
pg_dump "postgresql://postgres:PASSWORD@HOST:5432/postgres" \
  -F c -b -v -f "backup-$(date +%Y%m%d).dump"
```

### 8.3 Storage backup

```bash
# Install Supabase CLI
npm install -g supabase

# Download all files from menu-images bucket
supabase storage cp --recursive ss:///menu-images ./backups/menu-images-$(date +%Y%m%d)/
```

### 8.4 Backup retention policy

| Backup type | Frequency | Retention |
|-------------|-----------|-----------|
| Supabase auto (Pro) | Daily | 30 days |
| Manual SQL dump | Weekly | 90 days |
| Storage files | Monthly | Permanent (cloud storage) |

### 8.5 Disaster recovery

1. Create a new Supabase project
2. Restore: `psql -d "postgresql://..." -f backup-YYYYMMDD.sql`
3. Re-upload storage files
4. Update `NEXT_PUBLIC_SUPABASE_URL` + keys in Vercel
5. Trigger a new Vercel deployment

---

## 9. Monitoring & Error Logging

### 9.1 Built-in logging (included)

The app ships with `src/lib/logger.ts` — a structured logger that:
- Outputs pretty logs in development
- Emits JSON in production (visible in Vercel → Logs tab)
- Has a `safeRoute()` wrapper for API routes

Usage:
```ts
import { logger } from "@/lib/logger";

logger.info("Order created", { orderId, tableId });
logger.error("Supabase write failed", error, { payload });
```

### 9.2 Vercel Logs

1. Vercel dashboard → your project → **Logs** tab
2. Filter by:
   - `level:error` for runtime errors
   - `status:500` for failed API routes
3. Set up [Vercel Log Drains](https://vercel.com/docs/observability/log-drains) to forward to Datadog, Axiom, or Logtail

### 9.3 Add Sentry (optional, highly recommended)

```bash
npx @sentry/wizard@latest -i nextjs
```

Then uncomment the Sentry lines in `src/lib/logger.ts` and add `NEXT_PUBLIC_SENTRY_DSN` to your Vercel environment variables.

### 9.4 Uptime monitoring

Free options:
- [UptimeRobot](https://uptimerobot.com) — ping `/api/health/supabase` every 5 minutes
- [BetterUptime](https://betteruptime.com) — adds status page + SMS alerts

Your health endpoint is already at: `GET /api/health/supabase`

---

## 10. Common Issues

### "NEXT_PUBLIC_SUPABASE_URL is not configured"

The app is running in demo mode. Check that environment variables are set in Vercel and the deployment was triggered after adding them.

### Orders not appearing in kitchen realtime

1. Confirm Realtime is enabled for the `orders` table (see §7.4)
2. Check browser console for websocket errors
3. Verify `NEXT_PUBLIC_SUPABASE_URL` points to the correct project

### Image upload returns 403

1. Confirm the `menu-images` Storage bucket exists and is public
2. Check that `SUPABASE_SERVICE_ROLE_KEY` is set (server-only)
3. Run the storage RLS policies from §2.4

### PWA not updating after deployment

The service worker caches aggressively. Users must close all tabs and reopen, or:
```js
// In browser DevTools → Application → Service Workers → Unregister
```

### Build failing on Vercel

```bash
# Test the production build locally first
npm run build

# Common fixes:
# 1. TypeScript errors: fix them, don't use @ts-ignore
# 2. Missing env vars: check all NEXT_PUBLIC_ vars are set in Vercel
# 3. Out-of-memory: add NODE_OPTIONS=--max-old-space-size=4096 to build env
```

---

*For questions or issues, check the inline code comments or open an issue in your repository.*
