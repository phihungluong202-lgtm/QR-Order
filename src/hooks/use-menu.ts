"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMenu, menuKeys } from "@/api/menu";
import { isSupabaseConfigured } from "@/lib/env";
import { getBrowserServices } from "@/services";

export function useMenu(restaurantSlug: string) {
  return useQuery({
    queryKey: menuKeys.byRestaurant(restaurantSlug),
    queryFn: async () => {
      if (isSupabaseConfigured()) {
        const services = getBrowserServices();
        if (services) {
          const menu = await services.menu.getByRestaurantSlug(restaurantSlug);
          if (menu) return menu;
        }
      }
      return fetchMenu(restaurantSlug);
    },
  });
}
