import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "@/types/cart";
import type { MenuItem } from "@/types/database";

interface CartStore {
  tableId: string | null;
  restaurantId: string | null;
  lines: CartLine[];
  /** ID of the last successfully submitted order — drives success page */
  submittedOrderId: string | null;
  /** Stable key sent with POST /api/orders to prevent duplicate writes */
  idempotencyKey: string;
  setSession: (tableId: string, restaurantId: string) => void;
  addItem: (
    item: MenuItem,
    options?: { quantity?: number; notes?: string },
  ) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateLineNotes: (menuItemId: string, notes: string) => void;
  clearCart: () => void;
  setSubmittedOrderId: (orderId: string) => void;
  itemCount: () => number;
  subtotal: () => number;
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

      setSession: (tableId, restaurantId) =>
        set({ tableId, restaurantId }),

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

      clearCart: () =>
        set({ lines: [], submittedOrderId: null, idempotencyKey: generateKey() }),

      setSubmittedOrderId: (orderId) => set({ submittedOrderId: orderId }),

      itemCount: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),

      subtotal: () =>
        get().lines.reduce((sum, l) => sum + l.menuItem.price * l.quantity, 0),
    }),
    { name: "qr-order-cart" },
  ),
);
