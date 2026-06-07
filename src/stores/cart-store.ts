import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "@/types/cart";
import type { MenuItem, OrderStatus } from "@/types/database";

export interface TrackedOrder {
  id: string;
  status: OrderStatus;
  tableId: string;
  tableLabel?: string;
  total?: number;
  createdAt: string;
}

/** Statuses that mean the order is still active / worth tracking */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
];

/** Statuses where new items can still be appended to the order */
export const APPENDABLE_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
];

interface CartStore {
  tableId: string | null;
  restaurantId: string | null;
  lines: CartLine[];
  /** ID of the last successfully submitted order — drives success page */
  submittedOrderId: string | null;
  /** Stable key sent with POST /api/orders to prevent duplicate writes */
  idempotencyKey: string;
  /** Orders being tracked across navigation */
  activeOrders: TrackedOrder[];
  /** The current open order for this table session (for appending items) */
  tableOrderId: string | null;

  setSession: (tableId: string, restaurantId: string) => void;
  setTableOrderId: (orderId: string | null) => void;
  addItem: (
    item: MenuItem,
    options?: { quantity?: number; notes?: string },
  ) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateLineNotes: (menuItemId: string, notes: string) => void;
  clearCart: (clearOrder?: boolean) => void;
  setSubmittedOrderId: (orderId: string) => void;
  itemCount: () => number;
  subtotal: () => number;

  addTrackedOrder: (order: TrackedOrder) => void;
  updateTrackedStatus: (orderId: string, status: OrderStatus) => void;
  removeTrackedOrder: (orderId: string) => void;
  /** Merge server-fetched orders into activeOrders (restores state after reopen) */
  syncServerOrders: (orders: TrackedOrder[]) => void;
}

function generateKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      tableId: null,
      restaurantId: null,
      lines: [],
      submittedOrderId: null,
      idempotencyKey: generateKey(),
      activeOrders: [],
      tableOrderId: null,

      setSession: (tableId, restaurantId) =>
        set((state) => {
          // Only do a full reset when there was a PREVIOUS table that is DIFFERENT
          // (state.tableId === null means fresh/initial state — preserve whatever localStorage loaded)
          const switchedTable = state.tableId !== null && state.tableId !== tableId;
          if (switchedTable) {
            return {
              tableId,
              restaurantId,
              lines: [],
              tableOrderId: null,
              submittedOrderId: null,
              idempotencyKey: generateKey(),
              activeOrders: [],
            };
          }
          // Same table OR initial load — just update session IDs, keep everything else
          return { tableId, restaurantId };
        }),

      setTableOrderId: (orderId) => set({ tableOrderId: orderId }),

      addItem: (item, options) => {
        const quantity = options?.quantity ?? 1;
        const notes = options?.notes?.trim() || undefined;
        set((state) => {
          const existing = state.lines.find((l) => l.menuItem.id === item.id);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.menuItem.id === item.id
                  ? { ...l, quantity: l.quantity + quantity, notes: notes ?? l.notes }
                  : l,
              ),
            };
          }
          return {
            lines: [...state.lines, { menuItem: item, quantity, notes }],
          };
        });
      },

      updateLineNotes: (menuItemId, notes) =>
        set((state) => ({
          lines: state.lines.map((l) =>
            l.menuItem.id === menuItemId
              ? { ...l, notes: notes.trim() || undefined }
              : l,
          ),
        })),

      removeItem: (menuItemId) =>
        set((state) => ({
          lines: state.lines.filter((l) => l.menuItem.id !== menuItemId),
        })),

      updateQuantity: (menuItemId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              lines: state.lines.filter((l) => l.menuItem.id !== menuItemId),
            };
          }
          return {
            lines: state.lines.map((l) =>
              l.menuItem.id === menuItemId ? { ...l, quantity } : l,
            ),
          };
        }),

      clearCart: (clearOrder = false) =>
        set((state) => ({
          lines: [],
          submittedOrderId: null,
          idempotencyKey: generateKey(),
          tableOrderId: clearOrder ? null : state.tableOrderId,
        })),

      setSubmittedOrderId: (orderId) => set({ submittedOrderId: orderId }),

      itemCount: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),

      subtotal: () =>
        get().lines.reduce((sum, l) => sum + l.menuItem.price * l.quantity, 0),

      addTrackedOrder: (order) =>
        set((state) => ({
          activeOrders: [
            order,
            ...state.activeOrders.filter((o) => o.id !== order.id),
          ].slice(0, 10),
        })),

      updateTrackedStatus: (orderId, status) =>
        set((state) => ({
          activeOrders: state.activeOrders.map((o) =>
            o.id === orderId ? { ...o, status } : o,
          ),
        })),

      removeTrackedOrder: (orderId) =>
        set((state) => ({
          activeOrders: state.activeOrders.filter((o) => o.id !== orderId),
        })),

      syncServerOrders: (orders) =>
        set((state) => {
          // Merge: update status for existing, add missing ones
          const merged = [...state.activeOrders];
          for (const serverOrder of orders) {
            const idx = merged.findIndex((o) => o.id === serverOrder.id);
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], status: serverOrder.status, total: serverOrder.total ?? merged[idx].total };
            } else {
              merged.unshift(serverOrder);
            }
          }
          // Update tableOrderId to the most recent appendable server order if not already set
          const latestOpen = orders.find((o) =>
            ["pending", "confirmed", "preparing"].includes(o.status),
          );
          return {
            activeOrders: merged.slice(0, 10),
            tableOrderId: state.tableOrderId ?? latestOpen?.id ?? null,
          };
        }),
    }),
    { name: "qr-order-cart" },
  ),
);
