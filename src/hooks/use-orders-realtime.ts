"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { orderKeys } from "@/api/orders";
import { isSupabaseConfigured } from "@/lib/env";
import { createClientIfConfigured } from "@/lib/supabase/client";
import { subscribeToOrders } from "@/lib/supabase/realtime";

export interface UseOrdersRealtimeOptions {
  /** Called when a brand-new order arrives (INSERT event). Use for sound/alerts. */
  onNewOrder?: () => void;
}

/**
 * Invalidates kitchen order queries when Supabase Realtime fires.
 * Optionally calls `onNewOrder` when an INSERT event is detected.
 */
export function useOrdersRealtime(
  restaurantId: string | null,
  options: UseOrdersRealtimeOptions = {},
) {
  const { onNewOrder } = options;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!restaurantId || !isSupabaseConfigured()) return;

    const supabase = createClientIfConfigured();
    if (!supabase) return;

    const subscription = subscribeToOrders(
      supabase,
      restaurantId,
      ({ eventType }) => {
        queryClient.invalidateQueries({
          queryKey: orderKeys.kitchen(restaurantId),
        });
        if (eventType === "INSERT") {
          onNewOrder?.();
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [restaurantId, queryClient, onNewOrder]);
}

/** @deprecated Use useOrdersRealtime */
export const useKitchenRealtime = useOrdersRealtime;
