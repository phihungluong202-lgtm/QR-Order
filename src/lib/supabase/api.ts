import { createClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "@/lib/env";
import type { Database } from "@/types/database";
import type { TypedSupabaseClient } from "@/lib/database/helpers";

let cachedAnonClient: TypedSupabaseClient | null = null;

/**
 * Server-side client for API routes and services.
 * Prefers service role when set; falls back to anon (compatible with demo RLS).
 */
export function createApiClient(): TypedSupabaseClient | null {
  if (!isSupabaseConfigured()) return null;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && !serviceKey.includes("your-")) {
    return createClient<Database>(env.supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  if (!cachedAnonClient) {
    cachedAnonClient = createClient<Database>(
      env.supabaseUrl,
      env.supabaseAnonKey,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
  }
  return cachedAnonClient;
}
