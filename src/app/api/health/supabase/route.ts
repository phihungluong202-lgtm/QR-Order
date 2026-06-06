import { NextResponse } from "next/server";
import { DEMO_RESTAURANT_SLUG } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { getServerServices } from "@/services";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      connected: false,
      mode: "demo",
      message:
        "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local",
    });
  }

  const services = getServerServices();
  if (!services) {
    return NextResponse.json({
      connected: false,
      mode: "demo",
      message: "Could not create Supabase client",
    });
  }

  try {
    const restaurant = await services.restaurants.getBySlug(
      DEMO_RESTAURANT_SLUG,
    );
    return NextResponse.json({
      connected: true,
      mode: "supabase",
      restaurant,
      migrationsRequired: !restaurant,
      hint: restaurant
        ? null
        : "Run supabase/migrations/*.sql in your Supabase project",
    });
  } catch (e) {
    return NextResponse.json({
      connected: false,
      mode: "error",
      message: e instanceof Error ? e.message : "Connection failed",
      hint: "Run SQL migrations in Supabase Dashboard → SQL Editor",
    });
  }
}
