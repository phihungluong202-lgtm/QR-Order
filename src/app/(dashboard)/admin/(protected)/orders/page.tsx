"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ClipboardList, RefreshCw, TrendingUp } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn, formatCurrency } from "@/lib/utils";
import { useAdminOrders, useAdminStats } from "@/hooks/use-admin";
import type { OrderStatus, OrderWithRelations } from "@/types/database";

const STATUS_OPTIONS: { value: "all" | OrderStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "served", label: "Served" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE: Record<
  OrderStatus,
  "default" | "warning" | "success" | "secondary"
> = {
  pending: "warning",
  confirmed: "secondary",
  preparing: "default",
  ready: "success",
  served: "secondary",
  cancelled: "secondary",
};

function OrderRow({ order }: { order: OrderWithRelations }) {
  const [expanded, setExpanded] = useState(false);
  const items = order.order_items ?? [];

  return (
    <div className="overflow-hidden rounded-xl border transition-shadow hover:shadow-sm">
      <button
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-bold">Table {order.table?.label ?? "—"}</span>
          <Badge variant={STATUS_BADGE[order.status]} className="shrink-0">
            {order.status}
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <span className="hidden text-sm text-muted-foreground sm:block">
            {new Date(order.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="font-bold tabular-nums">
            {formatCurrency(order.total)}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
          />
        </div>
      </button>

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
            <div className="space-y-1 bg-muted/30 px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Items
              </p>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No item details
                </p>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      <span className="font-bold">{item.quantity}×</span>{" "}
                      {item.menu_item?.name ?? item.menu_item_id}
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
              <p className="mt-2 text-xs text-muted-foreground">
                Order ID: {order.id}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Orders"
        description="Full order history and revenue overview"
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
                  <p className="mt-1 text-2xl font-black tabular-nums">
                    {card.value}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {card.sub}
                  </p>
                </div>
                <card.icon className="h-5 w-5 text-muted-foreground/50" />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Status filter */}
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
                  statusFilter === opt.value
                    ? "bg-primary-foreground/20"
                    : "bg-muted",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Order list */}
      <div className="mt-4 space-y-2">
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
