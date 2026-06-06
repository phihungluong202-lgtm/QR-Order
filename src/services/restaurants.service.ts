import { getRestaurantBySlug } from "@/lib/database/helpers";
import type { TypedSupabaseClient } from "@/lib/database/helpers";
import type { Restaurant } from "@/types/database";

export class RestaurantsService {
  constructor(private readonly client: TypedSupabaseClient) {}

  async getBySlug(slug: string): Promise<Restaurant | null> {
    return getRestaurantBySlug(this.client, slug);
  }
}
