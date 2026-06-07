"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { createOrder } from "@/api/orders";
import { useCartStore } from "@/stores/cart-store";
import { useToast } from "@/components/ui/use-toast";

/**
 * Centralised hook for placing an order.
 *
 * Guarantees:
 * - Exactly-once submission: a React ref flag prevents a second call while
 *   TanStack Query's `isPending` is still settling (race condition guard).
 * - Idempotency key forwarded to the API route so a server-level duplicate
 *   check can be added without client-side changes.
 * - Cart is cleared and the success page is shown only after a confirmed 201.
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

  /** Prevents double-fire even before `isPending` flips */
  const submittingRef = useRef(false);

  const mutation = useMutation({
    mutationFn: (orderNotes?: string) => {
      if (!tableId || !restaurantId) {
        throw new Error("Table session not set. Please scan the QR code again.");
      }
      return createOrder({
        tableId,
        restaurantId,
        notes: orderNotes || undefined,
        items: lines.map((l) => ({
          menuItemId: l.menuItem.id,
          quantity: l.quantity,
          notes: l.notes,
        })),
        idempotencyKey,
      });
    },
    onMutate: () => {
      submittingRef.current = true;
    },
    onSuccess: (data) => {
      const order = data.order;
      const orderId = order?.id ?? "unknown";
      setSubmittedOrderId(orderId);
      if (order && tableId) {
        addTrackedOrder({
          id: order.id,
          status: order.status ?? "pending",
          tableId,
          total: order.total ?? undefined,
          createdAt: order.created_at ?? new Date().toISOString(),
        });
      }
      clearCart();
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
  };
}
