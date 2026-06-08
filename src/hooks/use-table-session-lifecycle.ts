"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, XCircle } from "lucide-react";
import { createClientIfConfigured } from "@/lib/supabase/client";
import { useCartStore } from "@/stores/cart-store";
import type { OrderStatus } from "@/types/database";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const NOTIFY_THEN_RESET_MS = 3_000;

type SessionEndReason = "paid" | "closed";

/**
 * Watches the current table session and resets the customer UI when admin
 * collects payment (all paid) or closes the table (all cancelled).
 */
export function useTableSessionLifecycle() {
  const router = useRouter();
  const { toast } = useToast();
  const tableId = useCartStore((s) => s.tableId);
  const activeOrders = useCartStore((s) => s.activeOrders);
  const updateTrackedStatus = useCartStore((s) => s.updateTrackedStatus);
  const resetTableSession = useCartStore((s) => s.resetTableSession);

  const [notice, setNotice] = useState<SessionEndReason | null>(null);
  const firedRef = useRef(false);

  const tableOrders = useMemo(
    () => activeOrders.filter((o) => o.tableId === tableId),
    [activeOrders, tableId],
  );

  const nonCancelled = tableOrders.filter((o) => o.status !== "cancelled");
  const allPaid =
    nonCancelled.length > 0 &&
    nonCancelled.every((o) => o.status === "paid");
  const allCancelled =
    tableOrders.length > 0 &&
    tableOrders.every((o) => o.status === "cancelled");

  // Realtime status sync for every order on this table
  useEffect(() => {
    if (!tableId) return;
    const client = createClientIfConfigured();
    if (!client) return;

    const channel = client
      .channel(`session-lifecycle-${tableId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `table_id=eq.${tableId}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; status: OrderStatus };
          if (updated?.id && updated?.status) {
            updateTrackedStatus(updated.id, updated.status);
          }
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [tableId, updateTrackedStatus]);

  // Allow a new session cycle after reset
  useEffect(() => {
    if (tableOrders.length === 0) {
      firedRef.current = false;
      setNotice(null);
    }
  }, [tableOrders.length]);

  // Detect session end → notify → reset after 3 s
  useEffect(() => {
    if (!tableId || firedRef.current) return;

    let reason: SessionEndReason | null = null;
    if (allPaid) reason = "paid";
    else if (allCancelled) reason = "closed";
    if (!reason) return;

    firedRef.current = true;
    setNotice(reason);

    if (reason === "paid") {
      toast({
        title: "Payment confirmed! 🙏",
        description: "Thank you for dining with us. Resetting your session…",
        duration: NOTIFY_THEN_RESET_MS,
      });
    } else {
      toast({
        title: "Table session ended",
        description: "This table has been closed. Starting fresh…",
        duration: NOTIFY_THEN_RESET_MS,
      });
    }

    const timer = setTimeout(() => {
      resetTableSession();
      setNotice(null);
      router.replace(`/table/${tableId}`);
    }, NOTIFY_THEN_RESET_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPaid, allCancelled, tableId]);

  return notice;
}

export function TableSessionNotice({ reason }: { reason: SessionEndReason }) {
  const isPaid = reason === "paid";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -80, opacity: 0 }}
        className={cn(
          "fixed inset-x-0 top-0 z-[60] border-b px-4 py-3 shadow-md backdrop-blur-md",
          isPaid
            ? "border-teal-300 bg-teal-50/95 dark:bg-teal-900/30"
            : "border-amber-300 bg-amber-50/95 dark:bg-amber-900/30",
        )}
      >
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              isPaid
                ? "bg-teal-100 text-teal-600 dark:bg-teal-900/50"
                : "bg-amber-100 text-amber-600 dark:bg-amber-900/50",
            )}
          >
            {isPaid ? (
              <CreditCard className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-sm font-bold",
                isPaid
                  ? "text-teal-700 dark:text-teal-300"
                  : "text-amber-700 dark:text-amber-300",
              )}
            >
              {isPaid ? "Payment confirmed! 🙏" : "Table session ended"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPaid
                ? "Thank you! Resetting in a few seconds…"
                : "Table closed by staff. Resetting in a few seconds…"}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
