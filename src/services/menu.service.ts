import { getRestaurantIdBySlug } from "@/lib/database/helpers";
import { assertNoError } from "@/lib/database/errors";
import type { TypedSupabaseClient } from "@/lib/database/helpers";
import type { MenuBundle } from "@/types/database";

export class MenuService {
  constructor(private readonly client: TypedSupabaseClient) {}

  async getByRestaurantSlug(slug: string): Promise<MenuBundle | null> {
    const restaurantId = await getRestaurantIdBySlug(this.client, slug);
    if (!restaurantId) return null;
    return this.getByRestaurantId(restaurantId);
  }

  async getByRestaurantId(restaurantId: string): Promise<MenuBundle> {
    const [{ data: categories, error: catError }, { data: items, error: itemError }] =
      await Promise.all([
        this.client
          .from("categories")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("sort_order"),
        this.client
          .from("menu_items")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .eq("is_available", true)
          .is("deleted_at", null)
          .order("sort_order"),
      ]);

    assertNoError(catError);
    assertNoError(itemError);

    return {
      categories: categories ?? [],
      items: items ?? [],
    };
  }
}
