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
  CreditCard,
  Banknote,
  ReceiptText,
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
  usePayTable,
} from "@/hooks/use-admin";
import type { OrderStatus, OrderWithRelations } from "@/types/database";
import { useToast } from "@/components/ui/use-toast";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: "all" | OrderStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "served", label: "Served" },
  { value: "paid", label: "Paid" },
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
  paid:      { badge: "success",   label: "Paid ✓",    Icon: CreditCard,      color: "text-teal-600" },
  cancelled: { badge: "secondary", label: "Cancelled", Icon: X,               color: "text-red-500" },
};

const NEXT_ACTIONS: Partial<Record<OrderStatus, { status: OrderStatus; label: string; className: string }[]>> = {
  pending: [
    { status: "confirmed", label: "Confirm order",     className: "bg-blue-600 hover:bg-blue-700 text-white" },
    { status: "cancelled", label: "Cancel",            className: "bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  ],
  confirmed: [
    { status: "preparing", label: "Start preparing",   className: "bg-orange-500 hover:bg-orange-600 text-white" },
    { status: "cancelled", label: "Cancel",            className: "bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  ],
  preparing: [
    { status: "ready",     label: "Mark as ready 🔔",  className: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    { status: "cancelled", label: "Cancel",            className: "bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  ],
  ready: [
    { status: "served",    label: "Mark as served ✓",  className: "bg-gray-800 hover:bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900" },
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
  const isDone = order.status === "served" || order.status === "cancelled" || order.status === "paid";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border transition-shadow",
        order.status === "ready" && "border-emerald-400 shadow-md shadow-emerald-100 dark:shadow-emerald-900/20",
        order.status === "pending" && "border-amber-300",
        order.status === "paid" && "border-teal-300 bg-teal-50/30 dark:bg-teal-900/10",
      )}
    >
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
              <p className="mt-2 text-[10px] text-muted-foreground font-mono">ID: {order.id}</p>
            </div>

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

            {isDone && (
              <>
                <Separator />
                <div className="px-4 py-2.5">
                  <p className={cn("text-xs font-medium", style.color)}>
                    {order.status === "served" ? "✓ Order completed"
                     : order.status === "paid" ? "✓ Payment received"
                     : "✗ Order cancelled"}
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

// ─── Table payment card ───────────────────────────────────────────────────────

interface TableGroup {
  tableId: string;
  tableLabel: string;
  orders: OrderWithRelations[];
  total: number;
}

function TablePaymentCard({ group }: { group: TableGroup }) {
  const { toast } = useToast();
  const { mutate: payTable, isPending } = usePayTable();
  const [paid, setPaid] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const activeOrders = group.orders.filter(
    (o) => !["cancelled", "paid"].includes(o.status),
  );
  const itemCount = activeOrders.reduce(
    (sum, o) => sum + (o.order_items?.reduce((s, i) => s + i.quantity, 0) ?? 0),
    0,
  );

  function handlePay() {
    payTable(group.tableId, {
      onSuccess: (data) => {
        setPaid(true);
        setShowConfirm(false);
        toast({
          title: `Table ${group.tableLabel} — Payment received ✓`,
          description: `${data.count} order${data.count > 1 ? "s" : ""} · ${formatCurrency(data.total)}`,
        });
      },
      onError: (err) => {
        toast({ title: "Payment failed", description: err.message, variant: "destructive" });
      },
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm transition-all",
        paid && "border-teal-300 bg-teal-50/40 dark:bg-teal-900/10",
      )}
    >
      {/* Table header */}
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full text-lg font-black",
            paid ? "bg-teal-100 text-teal-700 dark:bg-teal-900/40" : "bg-primary/10 text-primary",
          )}>
            {group.tableLabel}
          </div>
          <div>
            <p className="font-bold">Table {group.tableLabel}</p>
            <p className="text-xs text-muted-foreground">
              {activeOrders.length} order{activeOrders.length !== 1 ? "s" : ""} · {itemCount} items
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-black tabular-nums">{formatCurrency(group.total)}</p>
          {paid && (
            <p className="text-xs font-semibold text-teal-600 dark:text-teal-400">✓ Paid</p>
          )}
        </div>
      </div>

      {/* Orders summary */}
      <div className="divide-y">
        {activeOrders.map((order) => {
          const s = STATUS_STYLE[order.status];
          const Icon = s.Icon;
          return (
            <div key={order.id} className="flex items-center gap-3 px-5 py-2.5">
              <Icon className={cn("h-3.5 w-3.5 shrink-0", s.color)} />
              <span className="flex-1 text-sm">
                <span className="font-mono text-xs text-muted-foreground">
                  #{order.id.slice(0, 8).toUpperCase()}
                </span>
                {order.order_items && order.order_items.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {order.order_items.map((i) => `${i.quantity}× ${i.menu_item?.name ?? "item"}`).join(", ")}
                  </span>
                )}
              </span>
              <Badge variant={s.badge} className="shrink-0 text-[10px]">{s.label}</Badge>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatCurrency(order.total)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Payment action */}
      <div className="border-t bg-muted/20 px-5 py-3">
        {paid ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-teal-600 dark:text-teal-400">
            <CheckCircle2 className="h-4 w-4" />
            Payment received — customer will be notified
          </div>
        ) : showConfirm ? (
          <div className="flex items-center gap-2">
            <p className="flex-1 text-sm font-medium">
              Confirm payment of <span className="font-bold">{formatCurrency(group.total)}</span>?
            </p>
            <button
              onClick={() => setShowConfirm(false)}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handlePay}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Confirm
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-bold text-white hover:bg-teal-700 active:scale-[0.98] transition-all"
          >
            <Banknote className="h-4 w-4" />
            Collect Payment · {formatCurrency(group.total)}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Payment view (by table) ──────────────────────────────────────────────────

function PaymentView({ orders }: { orders: OrderWithRelations[] }) {
  // Group by table — only tables that have active (non-cancelled, non-paid) orders
  const tableMap = new Map<string, TableGroup>();

  for (const order of orders) {
    if (order.status === "cancelled" || order.status === "paid") continue;
    const tableId = order.table_id;
    const tableLabel = order.table?.label ?? "?";
    if (!tableMap.has(tableId)) {
      tableMap.set(tableId, { tableId, tableLabel, orders: [], total: 0 });
    }
    const group = tableMap.get(tableId)!;
    group.orders.push(order);
    group.total += order.total ?? 0;
  }

  const groups = [...tableMap.values()].sort((a, b) =>
    a.tableLabel.localeCompare(b.tableLabel, undefined, { numeric: true }),
  );

  if (groups.length === 0) {
    return (
      <EmptyState
        className="mt-10"
        icon={ReceiptText}
        title="No active tables"
        description="All tables have been paid or have no orders yet."
      />
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {groups.map((group) => (
        <TablePaymentCard key={group.tableId} group={group} />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageView = "orders" | "payment";

export default function AdminOrdersPage() {
  const { data: orders = [], isLoading, refetch, isFetching } = useAdminOrders();
  const { data: stats } = useAdminStats();
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [pageView, setPageView] = useState<PageView>("orders");

  const filtered =
    statusFilter === "all"
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  const totalRevenue = orders.reduce((s, o) => s + (o.total ?? 0), 0);
  const paidRevenue = orders
    .filter((o) => o.status === "paid")
    .reduce((s, o) => s + (o.total ?? 0), 0);

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const readyCount = orders.filter((o) => o.status === "ready").length;
  const activeTableCount = new Set(
    orders
      .filter((o) => !["cancelled", "paid"].includes(o.status))
      .map((o) => o.table_id),
  ).size;

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Orders"
        description="Manage order status and collect table payments"
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

      {/* Stats */}
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
            label: "Paid revenue",
            value: formatCurrency(paidRevenue),
            sub: `${activeTableCount} active table${activeTableCount !== 1 ? "s" : ""}`,
            icon: CreditCard,
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
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{card.label}</p>
                  <p className="mt-1 text-2xl font-black tabular-nums">{card.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{card.sub}</p>
                </div>
                <card.icon className="h-5 w-5 text-muted-foreground/50" />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* View tabs */}
      <div className="mt-6 flex gap-1 rounded-xl border bg-muted/40 p-1 w-fit">
        {(["orders", "payment"] as PageView[]).map((v) => (
          <button
            key={v}
            onClick={() => setPageView(v)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
              pageView === v
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v === "orders" ? (
              <><ClipboardList className="h-3.5 w-3.5" /> Orders</>
            ) : (
              <><CreditCard className="h-3.5 w-3.5" /> Payment{activeTableCount > 0 && <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-[10px] font-bold text-white">{activeTableCount}</span>}</>
            )}
          </button>
        ))}
      </div>

      {/* ── ORDERS VIEW ─────────────────────────────────────────────── */}
      {pageView === "orders" && (
        <>
          {/* Status filter chips */}
          <div className="mt-4 flex flex-wrap gap-2">
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

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>Click an order to expand → update its status</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Pending = needs confirmation</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Ready = call the customer</span>
          </div>

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
        </>
      )}

      {/* ── PAYMENT VIEW ────────────────────────────────────────────── */}
      {pageView === "payment" && (
        <div>
          <p className="mt-4 text-sm text-muted-foreground">
            Select a table and collect payment. Customers will see a payment confirmation on their device.
          </p>
          {isLoading ? (
            <div className="mt-4 space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : (
            <PaymentView orders={orders} />
          )}
        </div>
      )}
    </div>
  );
}
