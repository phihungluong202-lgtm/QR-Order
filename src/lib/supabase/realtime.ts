import type {
  RealtimeChannel,
  SupabaseClient,
} from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface RealtimeSubscription {
  channel: RealtimeChannel;
  unsubscribe: () => void;
}

export interface OrdersChangePayload {
  eventType: "INSERT" | "UPDATE" | "DELETE";
}

type OrdersChangeHandler = (payload: OrdersChangePayload) => void;

/**
 * Subscribe to order changes for a restaurant (kitchen / waiter dashboards).
 * The callback receives the event type so callers can react differently to
 * new orders (INSERT) vs. status updates (UPDATE).
 */
export function subscribeToOrders(
  client: SupabaseClient<Database>,
  restaurantId: string,
  onChange: OrdersChangeHandler,
): RealtimeSubscription {
  const channel = client
    .channel(`orders:${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      (payload) =>
        onChange({
          eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
        }),
    )
    .subscribe();

  return {
    channel,
    unsubscribe: () => {
      client.removeChannel(channel);
    },
  };
}

/**
 * Subscribe to a single table's order updates (optional customer tracking).
 */
export function subscribeToTable(
  client: SupabaseClient<Database>,
  tableId: string,
  onChange: OrdersChangeHandler,
): RealtimeSubscription {
  const channel = client
    .channel(`table-orders:${tableId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: `table_id=eq.${tableId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return {
    channel,
    unsubscribe: () => {
      client.removeChannel(channel);
    },
  };
}
