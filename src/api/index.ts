/**
 * API abstraction layer — React Query keys + HTTP fetchers.
 * Prefer hooks (useMenu, useOrders) in components; use services on the server.
 */
export { apiFetch, ApiError } from "@/api/client";
export {
  fetchMenu,
  menuKeys,
  type MenuResponse,
} from "@/api/menu";
export {
  createOrder,
  fetchKitchenOrders,
  orderKeys,
  updateOrderStatus,
  type CreateOrderPayload,
} from "@/api/orders";
