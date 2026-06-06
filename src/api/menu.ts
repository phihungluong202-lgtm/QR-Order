import { apiFetch } from "@/api/client";
import type { MenuCategory, MenuItem } from "@/types/database";

export interface MenuResponse {
  categories: MenuCategory[];
  items: MenuItem[];
}

export const menuKeys = {
  all: ["menu"] as const,
  byRestaurant: (slug: string) => [...menuKeys.all, slug] as const,
};

export async function fetchMenu(restaurantSlug: string) {
  return apiFetch<MenuResponse>(
    `/api/menu?restaurant=${encodeURIComponent(restaurantSlug)}`,
  );
}
