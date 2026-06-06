import { createBrowserClient } from "@supabase/ssr";
import { env, isSupabaseConfigured } from "@/lib/env";
import type { Database } from "@/types/database";
import type { TypedSupabaseClient } from "@/lib/database/helpers";

export function createClient(): TypedSupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    );
  }
  return createBrowserClient<Database>(
    env.supabaseUrl,
    env.supabaseAnonKey,
  ) as unknown as TypedSupabaseClient;
}

export function createClientIfConfigured(): TypedSupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createBrowserClient<Database>(
    env.supabaseUrl,
    env.supabaseAnonKey,
  ) as unknown as TypedSupabaseClient;
}
