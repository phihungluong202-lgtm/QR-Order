"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { createOrder } from "@/api/orders";
import { apiFetch } from "@/api/client";
import { useCartStore, APPENDABLE_ORDER_STATUSES } from "@/stores/cart-store";
import { useToast } from "@/components/ui/use-toast";
import type { Order } from "@/types/database";

/**
 * Centralised hook for placing / appending to an order.
 *
 * Logic:
 * 1. If a tableOrderId exists in the store AND the tracked order is still in
 *    an appendable status (pending / confirmed / preparing) → append new items
 *    to that existing order via POST /api/orders/:id/items.
 * 2. Otherwise → create a brand-new order.
 *
 * After success the cart is cleared but tableOrderId is preserved so the next
 * checkout will also append to the same order (until it's served / cancelled).
 */
export function useSubmitOrder() {
  const { toast } = useToast();
  const router = useRouter();

  const tableId = useCartStore((s) => s.tableId);
  const restaurantId = useCartStore((s) => s.restaurantId);
  const lines = useCartStore((s) => s.lines);
  const idempotencyKey = useCartStore((s) => s.idempotencyKey);
  const clearCart = useCartStore((s) => s.clearCart);
  const setSubmittedOrderId = useCartStore((s) => s.setSubmittedOrderId);
  const addTrackedOrder = useCartStore((s) => s.addTrackedOrder);
  const updateTrackedStatus = useCartStore((s) => s.updateTrackedStatus);
  const tableOrderId = useCartStore((s) => s.tableOrderId);
  const setTableOrderId = useCartStore((s) => s.setTableOrderId);
  const activeOrders = useCartStore((s) => s.activeOrders);

  const submittingRef = useRef(false);

  /** The existing running order (if any, still appendable, and belongs to THIS table) */
  const existingOrder = tableOrderId
    ? activeOrders.find(
        (o) =>
          o.id === tableOrderId &&
          o.tableId === tableId &&
          APPENDABLE_ORDER_STATUSES.includes(o.status),
      )
    : null;

  const isAppending = !!existingOrder;

  const mutation = useMutation({
    mutationFn: async (orderNotes?: string) => {
      if (!tableId || !restaurantId) {
        throw new Error("Table session not set. Please scan the QR code again.");
      }

      const items = lines.map((l) => ({
        menuItemId: l.menuItem.id,
        quantity: l.quantity,
        notes: l.notes,
      }));

      // ── Append to existing order ───────────────────────────────────────────
      if (existingOrder) {
        const data = await apiFetch<{ order: Order }>(
          `/api/orders/${existingOrder.id}/items`,
          {
            method: "POST",
            body: JSON.stringify({ items }),
          },
        );
        return { order: data.order, appended: true };
      }

      // ── Create new order ───────────────────────────────────────────────────
      const data = await createOrder({
        tableId,
        restaurantId,
        notes: orderNotes || undefined,
        items,
        idempotencyKey,
      });
      return { order: data.order, appended: false };
    },

    onMutate: () => {
      submittingRef.current = true;
    },

    onSuccess: ({ order, appended }) => {
      const orderId = order?.id ?? "unknown";

      if (appended && existingOrder) {
        // Just update the tracker — keep tableOrderId the same
        updateTrackedStatus(orderId, existingOrder.status);
        toast({
          title: "Items added to your order ✓",
          description: `${lines.length} item${lines.length > 1 ? "s" : ""} added to order #${orderId.slice(0, 8).toUpperCase()}`,
        });
      } else {
        // New order — save it as the table's running order
        setTableOrderId(orderId);
        if (order && tableId) {
          addTrackedOrder({
            id: order.id,
            status: order.status ?? "pending",
            tableId,
            total: order.total ?? undefined,
            createdAt: order.created_at ?? new Date().toISOString(),
          });
        }
      }

      clearCart(); // preserves tableOrderId + submittedOrderId
      setSubmittedOrderId(orderId);
      router.push(`/order-success?orderId=${orderId}`);
    },

    onError: (err: Error) => {
      submittingRef.current = false;
      toast({
        title: "Could not place order",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  function submit(orderNotes?: string) {
    if (submittingRef.current || mutation.isPending) return;
    mutation.mutate(orderNotes);
  }

  return {
    submit,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    canSubmit: !!tableId && !!restaurantId && lines.length > 0,
    isAppending,
    existingOrderId: existingOrder?.id ?? null,
  };
}
