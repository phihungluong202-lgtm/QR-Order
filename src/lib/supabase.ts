/**
 * Central Supabase entry point.
 * Prefer importing from here for consistent typed clients.
 */
export { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";
export { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
export { createApiClient } from "@/lib/supabase/api";
export { createAdminClient } from "@/lib/supabase/admin";
export {
  getSession,
  getUser,
  getStaffProfile,
  requireStaff,
  signInWithPassword,
  signOut,
  type StaffAuthResult,
} from "@/lib/supabase/auth";
export {
  subscribeToOrders,
  subscribeToTable,
  type RealtimeSubscription,
} from "@/lib/supabase/realtime";
export { updateSession } from "@/lib/supabase/middleware";
