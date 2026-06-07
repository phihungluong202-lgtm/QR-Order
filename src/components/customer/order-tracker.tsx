"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChefHat,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { createClientIfConfigured } from "@/lib/supabase/client";
import { useCartStore, ACTIVE_ORDER_STATUSES } from "@/stores/cart-store";
import type { TrackedOrder } from "@/stores/cart-store";
import type { OrderStatus } from "@/types/database";
import { cn } from "@/lib/utils";

// ─── Status metadata ──────────────────────────────────────────────────────────

const STATUS_META: Record<
  OrderStatus,
  { label: string; color: string; bg: string; Icon: React.ElementType; step: number }
> = {
  pending:   { label: "Waiting for kitchen", color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-900/20",  Icon: Clock,          step: 0 },
  confirmed: { label: "Order confirmed",      color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/20",   Icon: ClipboardList,  step: 1 },
  preparing: { label: "Kitchen preparing",    color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20", Icon: ChefHat,      step: 2 },
  ready:     { label: "Ready! Come get it 🎉", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20", Icon: CheckCircle2, step: 3 },
  served:    { label: "Served — enjoy!",       color: "text-gray-500",   bg: "bg-gray-50 dark:bg-gray-800/30",   Icon: UtensilsCrossed, step: 4 },
  cancelled: { label: "Cancelled",             color: "text-red-500",    bg: "bg-red-50 dark:bg-red-900/20",     Icon: X,             step: -1 },
};

const STEPS: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "served"];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatCurrency(amount?: number) {
  if (!amount) return "";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

// ─── Single order card ────────────────────────────────────────────────────────

function OrderCard({ order, onDismiss }: { order: TrackedOrder; onDismiss: () => void }) {
  const meta = STATUS_META[order.status];
  const Icon = meta.Icon;
  const currentStep = STEPS.indexOf(order.status);
  const isDone = order.status === "served" || order.status === "cancelled";

  return (
    <div className={cn("rounded-2xl border p-4 shadow-sm", meta.bg)}>
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 dark:bg-black/20", meta.color)}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className={cn("text-sm font-semibold leading-tight", meta.color)}>{meta.label}</p>
            <p className="text-xs text-muted-foreground">
              #{order.id.slice(0, 8).toUpperCase()} · {formatTime(order.createdAt)}
              {order.total ? ` · ${formatCurrency(order.total)}` : ""}
            </p>
          </div>
        </div>
        {isDone && (
          <button
            onClick={onDismiss}
            className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-black/10"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Progress bar (only for active statuses) */}
      {order.status !== "cancelled" && (
        <div className="flex items-center gap-0.5">
          {STEPS.slice(0, 5).map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-0.5">
              <div
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors duration-500",
                  i <= currentStep
                    ? "bg-current opacity-70"
                    : "bg-black/10 dark:bg-white/10",
                )}
                style={{ color: i <= currentStep ? "currentColor" : undefined }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Ready pulsing ring */}
      {order.status === "ready" && (
        <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          🔔 Your food is ready — please collect it!
        </p>
      )}
    </div>
  );
}

// ─── Realtime subscription hook ───────────────────────────────────────────────

function useRealtimeOrders() {
  const activeOrders = useCartStore((s) => s.activeOrders);
  const updateTrackedStatus = useCartStore((s) => s.updateTrackedStatus);
  const removeTrackedOrder = useCartStore((s) => s.removeTrackedOrder);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClientIfConfigured>["channel"]> | null>(null);

  useEffect(() => {
    const client = createClientIfConfigured();
    if (!client) return;

    const ids = activeOrders
      .filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status))
      .map((o) => o.id);

    if (ids.length === 0) return;

    // Clean up previous channel
    if (channelRef.current) {
      client.removeChannel(channelRef.current);
    }

    const channel = client
      .channel("order-tracker")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=in.(${ids.join(",")})`,
        },
        (payload) => {
          const updated = payload.new as { id: string; status: OrderStatus };
          if (updated?.id && updated?.status) {
            updateTrackedStatus(updated.id, updated.status);
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      client.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrders.map((o) => o.id + o.status).join(",")]);

  return { activeOrders, updateTrackedStatus, removeTrackedOrder };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OrderTracker() {
  const [open, setOpen] = useState(false);
  const { activeOrders, removeTrackedOrder } = useRealtimeOrders();

  // Only show orders that are active or recently finished (served in last 10 min)
  const visibleOrders = activeOrders.filter((o) => {
    if (ACTIVE_ORDER_STATUSES.includes(o.status)) return true;
    if (o.status === "served") {
      const age = Date.now() - new Date(o.createdAt).getTime();
      return age < 10 * 60 * 1000; // keep served for 10 min
    }
    return false;
  });

  if (visibleOrders.length === 0) return null;

  // Pick the most urgent active order for the banner
  const priorityOrder =
    visibleOrders.find((o) => o.status === "ready") ??
    visibleOrders.find((o) => o.status === "preparing") ??
    visibleOrders[0];

  const meta = STATUS_META[priorityOrder.status];
  const Icon = meta.Icon;
  const hasReady = visibleOrders.some((o) => o.status === "ready");

  return (
    <>
      {/* Sticky banner */}
      <motion.button
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed left-0 right-0 top-0 z-40 flex items-center justify-between gap-2 px-4 py-2.5 shadow-sm backdrop-blur-md",
          meta.bg,
          hasReady && "animate-pulse",
        )}
        aria-label="View order status"
      >
        <div className="flex items-center gap-2">
          {/* Pulsing dot */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", meta.color, "bg-current")} />
            <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full bg-current", meta.color)} />
          </span>
          <Icon className={cn("h-4 w-4 shrink-0", meta.color)} />
          <span className={cn("text-sm font-semibold", meta.color)}>{meta.label}</span>
          {visibleOrders.length > 1 && (
            <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-bold text-current">
              {visibleOrders.length}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className={cn("h-4 w-4", meta.color)} />
        ) : (
          <ChevronDown className={cn("h-4 w-4", meta.color)} />
        )}
      </motion.button>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="fixed left-0 right-0 top-10 z-40 mx-auto max-w-md px-3 pt-1"
            >
              <div className="rounded-2xl border bg-card shadow-xl">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <h2 className="font-bold text-base">Your Orders</h2>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-[60dvh] overflow-y-auto p-3 space-y-3">
                  {visibleOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onDismiss={() => removeTrackedOrder(order.id)}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Count badge for nav ──────────────────────────────────────────────────────

export function useActiveOrderCount() {
  return useCartStore((s) =>
    s.activeOrders.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status)).length,
  );
}

export function useHasReadyOrder() {
  return useCartStore((s) => s.activeOrders.some((o) => o.status === "ready"));
}
