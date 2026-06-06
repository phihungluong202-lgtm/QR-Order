import { apiFetch } from "@/api/client";
import type { Order, OrderStatus } from "@/types/database";

export const orderKeys = {
  all: ["orders"] as const,
  kitchen: (restaurantId: string) =>
    [...orderKeys.all, "kitchen", restaurantId] as const,
  table: (tableId: string) => [...orderKeys.all, "table", tableId] as const,
};

export interface CreateOrderPayload {
  tableId: string;
  restaurantId: string;
  notes?: string;
  items: { menuItemId: string; quantity: number; notes?: string }[];
  /** Prevents accidental duplicate submissions */
  idempotencyKey?: string;
}

export async function createOrder(payload: CreateOrderPayload) {
  return apiFetch<{ order: Order }>("/api/orders", {
    method: "POST",
    headers: payload.idempotencyKey
      ? { "Idempotency-Key": payload.idempotencyKey }
      : undefined,
    body: JSON.stringify(payload),
  });
}

export async function fetchKitchenOrders(restaurantId: string) {
  return apiFetch<{ orders: Order[] }>(
    `/api/orders?restaurantId=${encodeURIComponent(restaurantId)}&view=kitchen`,
  );
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  return apiFetch<{ order: Order }>(`/api/orders/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
