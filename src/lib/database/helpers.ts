import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Restaurant } from "@/types/database";
import { assertNoError, isNotFoundError } from "@/lib/database/errors";

/** Typed client for all service-layer queries */
export type TypedSupabaseClient = SupabaseClient<Database>;

export async function getRestaurantBySlug(
  client: TypedSupabaseClient,
  slug: string,
): Promise<Restaurant | null> {
  const { data, error } = await client
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (isNotFoundError(error)) return null;
  assertNoError(error);
  return data;
}

export async function getRestaurantIdBySlug(
  client: TypedSupabaseClient,
  slug: string,
): Promise<string | null> {
  const restaurant = await getRestaurantBySlug(client, slug);
  return restaurant?.id ?? null;
}
