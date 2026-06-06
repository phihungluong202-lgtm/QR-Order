function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

const PLACEHOLDER_PATTERNS = [
  "your-project",
  "your-anon-key",
  "your-service-role",
  "xxxxx",
];

function isPlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((p) => lower.includes(p));
}

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  restaurantSlug:
    process.env.NEXT_PUBLIC_RESTAURANT_SLUG ?? "demo",
} as const;

export function isSupabaseConfigured(): boolean {
  const { supabaseUrl, supabaseAnonKey } = env;
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseAnonKey)) {
    return false;
  }
  try {
    new URL(supabaseUrl);
    return supabaseUrl.includes("supabase.co");
  } catch {
    return false;
  }
}

export function assertSupabaseEnv() {
  required("NEXT_PUBLIC_SUPABASE_URL", env.supabaseUrl);
  required("NEXT_PUBLIC_SUPABASE_ANON_KEY", env.supabaseAnonKey);
}
