"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  BellOff,
  BellRing,
  ChefHat,
  CheckCheck,
  Flame,
  Loader2,
  RefreshCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEMO_RESTAURANT_ID } from "@/lib/constants";
import { useKitchenOrders, useUpdateOrderStatus } from "@/hooks/use-orders";
import { useOrdersRealtime } from "@/hooks/use-orders-realtime";
import { useKitchenSound } from "@/hooks/use-kitchen-sound";
import type { OrderStatus, OrderWithRelations } from "@/types/database";

// ─── Status columns ────────────────────────────────────────────────────────────

const COLUMNS = [
  {
    key: "pending" as const,
    label: "Pending",
    statuses: ["pending", "confirmed"] as OrderStatus[],
    accent: "border-amber-400 bg-amber-50 dark:bg-amber-950/30",
    headerBg: "bg-amber-400/10",
    headerText: "text-amber-700 dark:text-amber-400",
    dotColor: "bg-amber-500",
    actionLabel: "Start Cooking",
    actionVariant: "default" as const,
    nextStatus: "preparing" as OrderStatus,
    icon: BellRing,
  },
  {
    key: "preparing" as const,
    label: "Preparing",
    statuses: ["preparing"] as OrderStatus[],
    accent: "border-blue-400 bg-blue-50 dark:bg-blue-950/30",
    headerBg: "bg-blue-400/10",
    headerText: "text-blue-700 dark:text-blue-400",
    dotColor: "bg-blue-500",
    actionLabel: "Mark Ready",
    actionVariant: "default" as const,
    nextStatus: "ready" as OrderStatus,
    icon: Flame,
  },
  {
    key: "ready" as const,
    label: "Ready",
    statuses: ["ready"] as OrderStatus[],
    accent: "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
    headerBg: "bg-emerald-400/10",
    headerText: "text-emerald-700 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
    actionLabel: "Mark Served",
    actionVariant: "outline" as const,
    nextStatus: "served" as OrderStatus,
    icon: CheckCheck,
  },
] as const;

// ─── Elapsed time ───────────────────────────────────────────────────────────────

function useElapsedSeconds(since: string) {
  const [seconds, setSeconds] = useState(() =>
    Math.floor((Date.now() - new Date(since).getTime()) / 1000),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - new Date(since).getTime()) / 1000));
    }, 1_000);
    return () => clearInterval(id);
  }, [since]);

  return seconds;
}

function ElapsedBadge({ since }: { since: string }) {
  const seconds = useElapsedSeconds(since);
  const mins = Math.floor(seconds / 60);

  const label =
    seconds < 60
      ? `${seconds}s`
      : mins < 60
        ? `${mins} min`
        : `${Math.floor(mins / 60)}h ${mins % 60}m`;

  const urgency =
    mins >= 20
      ? "text-red-600 dark:text-red-400 font-bold animate-pulse"
      : mins >= 10
        ? "text-orange-600 dark:text-orange-400 font-semibold"
        : mins >= 5
          ? "text-amber-600 dark:text-amber-400"
          : "text-muted-foreground";

  return (
    <span className={cn("tabular-nums text-sm", urgency)}>{label} ago</span>
  );
}

// ─── Order card ─────────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: OrderWithRelations;
  column: (typeof COLUMNS)[number];
  onAdvance: (orderId: string, status: OrderStatus) => void;
  isPending: boolean;
  activeOrderId: string | null;
}

function OrderCard({
  order,
  column,
  onAdvance,
  isPending,
  activeOrderId,
}: OrderCardProps) {
  const isActive = activeOrderId === order.id;
  const items = order.order_items ?? [];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.93, transition: { duration: 0.18 } }}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border-2 p-4 shadow-sm transition-shadow hover:shadow-md",
        column.accent,
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={cn("text-xs font-semibold uppercase tracking-wide", column.headerText)}>
            Table
          </p>
          <p className="text-2xl font-black leading-none">
            {order.table?.label ?? "—"}
          </p>
        </div>
        <ElapsedBadge since={order.created_at} />
      </div>

      {/* Item list */}
      <ul className="min-h-[2.5rem] space-y-1 border-t border-current/10 pt-2">
        {items.length === 0 ? (
          <li className="text-sm text-muted-foreground italic">
            Loading items…
          </li>
        ) : (
          items.map((item) => (
            <li key={item.id} className="text-sm leading-snug">
              <span className="font-bold">{item.quantity}×</span>{" "}
              <span>{item.menu_item?.name ?? item.menu_item_id}</span>
              {item.notes && (
                <p className="ml-4 text-xs text-muted-foreground italic">
                  ↳ {item.notes}
                </p>
              )}
            </li>
          ))
        )}
      </ul>

      {/* Order-level notes */}
      {order.notes && (
        <p className="rounded-lg bg-yellow-100 px-3 py-2 text-xs text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
          📝 {order.notes}
        </p>
      )}

      {/* Action button */}
      <Button
        size="lg"
        variant={column.actionVariant}
        className="mt-1 h-14 w-full text-base font-bold tracking-wide"
        disabled={isPending}
        onClick={() => onAdvance(order.id, column.nextStatus)}
      >
        {isActive && isPending ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <column.icon className="mr-2 h-5 w-5" />
        )}
        {column.actionLabel}
      </Button>
    </motion.article>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function KitchenDashboardPage() {
  const sound = useKitchenSound();
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Track previous order IDs to detect new orders in demo / polling mode
  const prevOrderIdsRef = useRef<Set<string>>(new Set());

  // Stable sound.play reference for the realtime hook
  const onNewOrder = useCallback(() => sound.play(), [sound]);

  useOrdersRealtime(DEMO_RESTAURANT_ID, { onNewOrder });

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } =
    useKitchenOrders(DEMO_RESTAURANT_ID);

  const mutation = useUpdateOrderStatus(DEMO_RESTAURANT_ID);

  const allOrders = useMemo(
    () =>
      (data?.orders ?? []).filter(
        (o) => !["served", "cancelled"].includes(o.status),
      ),
    [data],
  );

  // Detect new orders in demo / polling mode (no Supabase realtime)
  useEffect(() => {
    const ids = new Set(allOrders.map((o) => o.id));
    const prev = prevOrderIdsRef.current;

    if (prev.size > 0) {
      const hasNew = [...ids].some((id) => !prev.has(id));
      if (hasNew) sound.play();
    }

    prevOrderIdsRef.current = ids;
  }, [allOrders, sound]);

  // Group orders into columns
  const columnOrders = useMemo(() => {
    const grouped: Record<string, OrderWithRelations[]> = {};
    for (const col of COLUMNS) {
      grouped[col.key] = allOrders.filter((o) =>
        (col.statuses as readonly string[]).includes(o.status),
      );
    }
    return grouped;
  }, [allOrders]);

  const totalPending = columnOrders["pending"]?.length ?? 0;

  function handleAdvance(orderId: string, status: OrderStatus) {
    setActiveOrderId(orderId);
    mutation.mutate(
      { orderId, status },
      { onSettled: () => setActiveOrderId(null) },
    );
  }

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null;

  return (
    // Full-viewport layout — designed to fill a mounted kitchen display
    <div
      className="flex h-dvh flex-col overflow-hidden bg-background"
      onClick={sound.unlock}
    >
      {/* ── Header ── */}
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b bg-card px-4 py-3 md:px-6">
        {/* Title */}
        <div className="flex items-center gap-2 mr-auto">
          <ChefHat className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-black tracking-tight">Kitchen</h1>

          {/* Live indicator */}
          <span className="flex items-center gap-1.5 rounded-full border bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>

          {/* New order badge */}
          <AnimatePresence>
            {totalPending > 0 && (
              <motion.span
                key={totalPending}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-white"
              >
                {totalPending} new
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Stats row — desktop inline, mobile wraps */}
        <div className="hidden items-center gap-4 text-sm md:flex">
          {COLUMNS.map((col) => (
            <span key={col.key} className="flex items-center gap-1.5">
              <span
                className={cn("inline-block h-2.5 w-2.5 rounded-full", col.dotColor)}
              />
              <span className={cn("font-semibold", col.headerText)}>
                {columnOrders[col.key]?.length ?? 0}
              </span>
              <span className="text-muted-foreground">{col.label}</span>
            </span>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Autoplay blocked warning */}
          {sound.blocked && (
            <span className="text-xs text-amber-600">Tap to unlock sound</span>
          )}

          {/* Sound toggle */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={sound.toggle}
            title={sound.enabled ? "Mute notifications" : "Enable notifications"}
          >
            {sound.enabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

          {/* Manual refresh */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => refetch()}
            title={lastUpdated ? `Last updated ${lastUpdated}` : "Refresh"}
          >
            <RefreshCw
              className={cn("h-4 w-4", isFetching && "animate-spin")}
            />
          </Button>
        </div>
      </header>

      {/* Autoplay blocked banner */}
      <AnimatePresence>
        {sound.blocked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              <BellOff className="h-4 w-4 shrink-0" />
              Tap anywhere on the page to enable sound notifications
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Board ── */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading orders…</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 gap-4 overflow-hidden p-4 md:p-6">
          {COLUMNS.map((col) => {
            const orders = columnOrders[col.key] ?? [];
            const Icon = col.icon;

            return (
              <div
                key={col.key}
                className="flex flex-1 min-w-0 flex-col rounded-2xl border bg-muted/20 overflow-hidden"
              >
                {/* Column header */}
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-between px-4 py-3",
                    col.headerBg,
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-5 w-5", col.headerText)} />
                    <h2
                      className={cn(
                        "text-sm font-bold uppercase tracking-widest",
                        col.headerText,
                      )}
                    >
                      {col.label}
                    </h2>
                  </div>
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-black",
                      col.dotColor,
                      "text-white",
                    )}
                  >
                    {orders.length}
                  </span>
                </div>

                {/* Order list — independently scrollable */}
                <div className="flex-1 overflow-y-auto p-3">
                  {orders.length === 0 ? (
                    <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground/60">
                      <Icon className="h-8 w-8" />
                      <p className="text-sm">All clear</p>
                    </div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      <div className="space-y-3">
                        {orders.map((order) => (
                          <OrderCard
                            key={order.id}
                            order={order}
                            column={col}
                            onAdvance={handleAdvance}
                            isPending={mutation.isPending}
                            activeOrderId={activeOrderId}
                          />
                        ))}
                      </div>
                    </AnimatePresence>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer status bar */}
      <footer className="shrink-0 border-t bg-muted/40 px-4 py-1.5 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>
            {allOrders.length} active order{allOrders.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            {isFetching && <RefreshCw className="h-3 w-3 animate-spin" />}
            {lastUpdated ? `Updated ${lastUpdated}` : "Waiting for data…"}
          </span>
        </div>
      </footer>
    </div>
  );
}
