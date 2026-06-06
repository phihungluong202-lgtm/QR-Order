import { createApiClient } from "@/lib/supabase/api";
import { createClientIfConfigured as createBrowserClient } from "@/lib/supabase/client";
import { AdminService } from "@/services/admin.service";
import { MenuService } from "@/services/menu.service";
import { OrdersService } from "@/services/orders.service";
import { RestaurantsService } from "@/services/restaurants.service";
import { TablesService } from "@/services/tables.service";

/** Server / API route services (singleton per request via factory) */
export function getServerServices() {
  const client = createApiClient();
  if (!client) return null;

  return {
    admin: new AdminService(client),
    menu: new MenuService(client),
    orders: new OrdersService(client),
    tables: new TablesService(client),
    restaurants: new RestaurantsService(client),
  };
}

/** Browser services for direct Supabase reads (RLS) */
export function getBrowserServices() {
  const client = createBrowserClient();
  if (!client) return null;

  return {
    admin: new AdminService(client),
    menu: new MenuService(client),
    orders: new OrdersService(client),
    tables: new TablesService(client),
    restaurants: new RestaurantsService(client),
  };
}

export { AdminService, MenuService, OrdersService, TablesService, RestaurantsService };
