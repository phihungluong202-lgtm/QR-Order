import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, isSupabaseConfigured } from "@/lib/env";
import type { Database } from "@/types/database";
import type { TypedSupabaseClient } from "@/lib/database/helpers";

export async function createClient(): Promise<TypedSupabaseClient> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: CookieOptions;
        }[],
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component — session refresh handled in middleware
        }
      },
    },
  }) as unknown as TypedSupabaseClient;
}

export async function createClientIfConfigured(): Promise<TypedSupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}
