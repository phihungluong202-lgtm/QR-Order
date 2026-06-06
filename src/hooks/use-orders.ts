"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOrder,
  fetchKitchenOrders,
  orderKeys,
  updateOrderStatus,
} from "@/api/orders";
import { isSupabaseConfigured } from "@/lib/env";
import { getBrowserServices } from "@/services";
import type { CreateOrderPayload } from "@/api/orders";
import type { OrderStatus } from "@/types/database";

export function useKitchenOrders(restaurantId: string) {
  return useQuery({
    queryKey: orderKeys.kitchen(restaurantId),
    queryFn: async () => {
      if (isSupabaseConfigured()) {
        const services = getBrowserServices();
        if (services) {
          const orders = await services.orders.listForRestaurant(restaurantId, {
            kitchenView: true,
          });
          return { orders };
        }
      }
      return fetchKitchenOrders(restaurantId);
    },
    refetchInterval: isSupabaseConfigured() ? false : 30_000,
  });
}

export function useUpdateOrderStatus(restaurantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => {
      if (isSupabaseConfigured()) {
        const services = getBrowserServices();
        if (services) {
          const order = await services.orders.updateStatus(orderId, status);
          return { order };
        }
      }
      return updateOrderStatus(orderId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orderKeys.kitchen(restaurantId),
      });
    },
  });
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => createOrder(payload),
  });
}
