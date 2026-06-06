# Kết nối Supabase

## 1. Tạo project

1. Đăng nhập [supabase.com](https://supabase.com) → **New project**
2. Chờ database sẵn sàng (~2 phút)

## 2. Chạy migration (schema + dữ liệu demo)

**Cách A — SQL Editor:** **New query** → dán và chạy **lần lượt**:

### Dự án mới (khuyến nghị)

1. `supabase/migrations/20250605000000_complete_schema.sql`
2. `supabase/migrations/20250605000001_complete_seed.sql`

Chi tiết schema: `supabase/schema/README.md`

**Cách B — Cursor + Supabase MCP:** Bật plugin Supabase MCP, đăng nhập OAuth, rồi nhờ Agent chạy `apply_migration` cho hai file trên (đã hỗ trợ tự động).

### Dự án cũ (đã chạy migration 20250603*)

File `20250605000000` tự **thêm cột** (`deleted_at`, `updated_at`, …) nếu bảng đã tồn tại từ schema cũ, và **copy** `menu_categories` → `categories`.

Nếu vẫn gặp lỗi trùng enum/bảng khác, chỉ chạy seed + staff nếu thiếu:

1. `supabase/migrations/20250603000001_seed_demo.sql` (nếu chưa có dữ liệu)
2. `supabase/migrations/20250604000000_staff_auth.sql`

Hoặc tạo project Supabase mới và dùng bộ migration **complete** ở trên.

## 3. Realtime (bếp / waiter)

Migration complete đã thêm `orders` và `order_items` vào publication `supabase_realtime`.

Kiểm tra: **Database → Publications → supabase_realtime** — hai bảng trên phải được bật.

## 4. Cấu hình `.env.local`

Mở `.env.local` trong thư mục project, thay:

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- URL là **Project URL** (không có `/rest/v1/`)
- Key là **anon** / **publishable** key từ **Project Settings → API**

Lưu file trên đĩa (không chỉ trong editor chưa save), rồi restart dev server.

## 5. Restart dev server

```bash
# Ctrl+C trong terminal
npm run dev
```

## 6. Kiểm tra

- Trình duyệt: http://localhost:3000/api/health/supabase  
  - `connected: true` + có `restaurant` → OK  
  - `migrationsRequired: true` → chạy lại bước 2  
- Đặt thử đơn: `/t/demo/table-1` → menu → checkout  
- **Table Editor** trên Supabase → bảng `orders` có dòng mới

## 7. Tạo tài khoản admin (staff)

1. **Authentication → Users → Add user** (email + password)
2. Copy user **UUID**
3. SQL Editor:

```sql
INSERT INTO public.admin_users (id, restaurant_id, email, role, display_name)
VALUES (
  'PASTE_USER_UUID_HERE',
  '00000000-0000-0000-0000-000000000001',
  'admin@example.com',
  'admin',
  'Admin'
);
```

4. Đăng nhập: http://localhost:3000/admin/login

## Ghi chú

- **Service role key** không bắt buộc; anon key + RLS đủ cho demo.
- Không commit `.env.local` (đã có trong `.gitignore`).
- Code: `src/lib/supabase/`, `src/services/`, `src/hooks/use-*.ts`
- Soft delete: catalog dùng `deleted_at`; app lọc `.is('deleted_at', null)` khi đọc menu/bàn/đơn.
