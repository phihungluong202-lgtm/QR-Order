"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ClipboardList,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  ChefHat,
  Clock,
  UtensilsCrossed,
  X,
  Loader2,
  Bell,
} from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn, formatCurrency } from "@/lib/utils";
import {
  useAdminOrders,
  useAdminStats,
  useUpdateOrderStatus,
} from "@/hooks/use-admin";
import type { OrderStatus, OrderWithRelations } from "@/types/database";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: "all" | OrderStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "served", label: "Served" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_STYLE: Record<
  OrderStatus,
  { badge: "default" | "warning" | "success" | "secondary"; label: string; Icon: React.ElementType; color: string }
> = {
  pending:   { badge: "warning",   label: "Pending",   Icon: Clock,           color: "text-amber-600" },
  confirmed: { badge: "secondary", label: "Confirmed", Icon: CheckCircle2,    color: "text-blue-600" },
  preparing: { badge: "default",   label: "Preparing", Icon: ChefHat,         color: "text-orange-600" },
  ready:     { badge: "success",   label: "Ready",     Icon: Bell,            color: "text-emerald-600" },
  served:    { badge: "secondary", label: "Served",    Icon: UtensilsCrossed, color: "text-gray-500" },
  cancelled: { badge: "secondary", label: "Cancelled", Icon: X,               color: "text-red-500" },
};

// Status flow: what action buttons to show for each status
const NEXT_ACTIONS: Partial<Record<OrderStatus, { status: OrderStatus; label: string; className: string }[]>> = {
  pending: [
    { status: "confirmed", label: "Confirm order",    className: "bg-blue-600 hover:bg-blue-700 text-white" },
    { status: "cancelled", label: "Cancel",           className: "bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  ],
  confirmed: [
    { status: "preparing", label: "Start preparing",  className: "bg-orange-500 hover:bg-orange-600 text-white" },
    { status: "cancelled", label: "Cancel",           className: "bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  ],
  preparing: [
    { status: "ready",     label: "Mark as ready 🔔", className: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    { status: "cancelled", label: "Cancel",           className: "bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  ],
  ready: [
    { status: "served",    label: "Mark as served ✓", className: "bg-gray-800 hover:bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900" },
  ],
};

// ─── Order row ────────────────────────────────────────────────────────────────

function OrderRow({ order }: { order: OrderWithRelations }) {
  const [expanded, setExpanded] = useState(false);
  const { mutate: updateStatus, isPending, variables } = useUpdateOrderStatus();
  const items = order.order_items ?? [];
  const style = STATUS_STYLE[order.status];
  const StatusIcon = style.Icon;
  const actions = NEXT_ACTIONS[order.status] ?? [];
  const isDone = order.status === "served" || order.status === "cancelled";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border transition-shadow",
        order.status === "ready" && "border-emerald-400 shadow-md shadow-emerald-100 dark:shadow-emerald-900/20",
        order.status === "pending" && "border-amber-300",
      )}
    >
      {/* Header row (always visible) */}
      <button
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <StatusIcon className={cn("h-4 w-4 shrink-0", style.color)} />
          <span className="font-bold">Table {order.table?.label ?? "—"}</span>
          <Badge variant={style.badge} className="shrink-0">{style.label}</Badge>
          {order.status === "ready" && (
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:block">
            {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="font-bold tabular-nums">{formatCurrency(order.total)}</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Separator />

            {/* Items list */}
            <div className="space-y-1 bg-muted/20 px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items</p>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No item details</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span>
                      <span className="font-bold">{item.quantity}×</span>{" "}
                      {item.menu_item?.name ?? item.menu_item_id}
                      {item.notes && (
                        <span className="ml-1 text-xs text-muted-foreground">({item.notes})</span>
                      )}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatCurrency(item.unit_price * item.quantity)}
                    </span>
                  </div>
                ))
              )}
              {order.notes && (
                <p className="mt-2 rounded-lg bg-yellow-50 px-3 py-1.5 text-xs text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                  📝 {order.notes}
                </p>
              )}
              <p className="mt-2 text-[10px] text-muted-foreground font-mono">
                ID: {order.id}
              </p>
            </div>

            {/* Status action buttons */}
            {!isDone && actions.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-2 px-4 py-3">
                  <p className="w-full text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Update status
                  </p>
                  {actions.map((action) => {
                    const isUpdating = isPending && variables?.orderId === order.id && variables?.status === action.status;
                    return (
                      <button
                        key={action.status}
                        disabled={isPending}
                        onClick={() => updateStatus({ orderId: order.id, status: action.status })}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all active:scale-95 disabled:opacity-60",
                          action.className,
                        )}
                      >
                        {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Done state message */}
            {isDone && (
              <>
                <Separator />
                <div className="px-4 py-2.5">
                  <p className={cn("text-xs font-medium", style.color)}>
                    {order.status === "served" ? "✓ Order completed" : "✗ Order cancelled"}
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const { data: orders = [], isLoading, refetch, isFetching } = useAdminOrders();
  const { data: stats } = useAdminStats();
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");

  const filtered =
    statusFilter === "all"
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  const totalRevenue = orders.reduce((s, o) => s + (o.total ?? 0), 0);
  const servedRevenue = orders
    .filter((o) => o.status === "served")
    .reduce((s, o) => s + (o.total ?? 0), 0);

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const readyCount = orders.filter((o) => o.status === "ready").length;

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Orders"
        description="Manage and update order status in real time"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {/* Alert banners */}
      <AnimatePresence>
        {readyCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 dark:bg-emerald-900/20"
          >
            <Bell className="h-4 w-4 text-emerald-600 animate-bounce" />
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              {readyCount} order{readyCount > 1 ? "s" : ""} ready to serve!
            </p>
          </motion.div>
        )}
        {pendingCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 dark:bg-amber-900/20"
          >
            <Clock className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {pendingCount} new order{pendingCount > 1 ? "s" : ""} waiting for confirmation
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Revenue summary */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total orders",
            value: String(orders.length),
            sub: `${stats?.ordersToday ?? "—"} today`,
            icon: ClipboardList,
          },
          {
            label: "Potential revenue",
            value: formatCurrency(totalRevenue),
            sub: "All non-cancelled",
            icon: TrendingUp,
          },
          {
            label: "Confirmed revenue",
            value: formatCurrency(servedRevenue),
            sub: "Served orders only",
            icon: TrendingUp,
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {card.label}
                  </p>
                  <p className="mt-1 text-2xl font-black tabular-nums">{card.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{card.sub}</p>
                </div>
                <card.icon className="h-5 w-5 text-muted-foreground/50" />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Status filter chips */}
      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => {
          const count =
            opt.value === "all"
              ? orders.length
              : orders.filter((o) => o.status === opt.value).length;
          return (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                statusFilter === opt.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted",
              )}
            >
              {opt.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px]",
                  statusFilter === opt.value ? "bg-primary-foreground/20" : "bg-muted",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Quick action guide */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>Click on an order to expand → then update its status</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Pending = needs confirmation</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Ready = call the customer</span>
      </div>

      {/* Order list */}
      <div className="mt-3 space-y-2">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))
        ) : filtered.length === 0 ? (
          <EmptyState
            className="mt-8"
            icon={ClipboardList}
            title="No orders"
            description={
              statusFilter === "all"
                ? "Orders will appear here when customers place them."
                : `No ${statusFilter} orders.`
            }
          />
        ) : (
          <AnimatePresence>
            {filtered.map((order: OrderWithRelations) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <OrderRow order={order} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
