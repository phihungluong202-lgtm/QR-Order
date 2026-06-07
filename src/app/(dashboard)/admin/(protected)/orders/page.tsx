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
import { useEffect, useMemo, useState } from "react";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formats table label properly — avoids "Table table 3" double-prefix */
function tableDisplayName(label?: string | null): string {
  if (!label) return "Unknown table";
  const trimmed = label.trim();
  // If label is just a number → "Table 2"
  if (/^\d+$/.test(trimmed)) return `Table ${trimmed}`;
  // If label already starts with "table" (case-insensitive) → capitalize, don't double-prefix
  if (/^table\s+/i.test(trimmed)) {
    const rest = trimmed.replace(/^table\s+/i, "");
    return `Table ${rest}`;
  }
  return trimmed; // "VIP 1", "A1", etc
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

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
  {
    badge: "default" | "warning" | "success" | "secondary";
    label: string;
    Icon: React.ElementType;
    color: string;
    rowBg: string;
    borderColor: string;
  }
> = {
  pending:   { badge: "warning",   label: "Pending",   Icon: Clock,           color: "text-amber-600",  rowBg: "bg-amber-50/60 dark:bg-amber-900/10",    borderColor: "border-l-amber-400" },
  confirmed: { badge: "secondary", label: "Confirmed", Icon: CheckCircle2,    color: "text-blue-600",   rowBg: "bg-blue-50/60 dark:bg-blue-900/10",      borderColor: "border-l-blue-400" },
  preparing: { badge: "default",   label: "Preparing", Icon: ChefHat,         color: "text-orange-600", rowBg: "bg-orange-50/60 dark:bg-orange-900/10",  borderColor: "border-l-orange-400" },
  ready:     { badge: "success",   label: "Ready",     Icon: Bell,            color: "text-emerald-600",rowBg: "bg-emerald-50/60 dark:bg-emerald-900/10",borderColor: "border-l-emerald-500" },
  served:    { badge: "secondary", label: "Served",    Icon: UtensilsCrossed, color: "text-gray-500",   rowBg: "",                                        borderColor: "border-l-gray-300" },
  paid:      { badge: "success",   label: "Paid ✓",   Icon: CreditCard,      color: "text-teal-600",   rowBg: "bg-teal-50/40 dark:bg-teal-900/10",      borderColor: "border-l-teal-400" },
  cancelled: { badge: "secondary", label: "Cancelled", Icon: X,               color: "text-red-400",    rowBg: "opacity-60",                              borderColor: "border-l-red-300" },
};

const NEXT_ACTIONS: Partial<Record<OrderStatus, { status: OrderStatus; label: string; className: string; shortLabel: string }[]>> = {
  pending: [
    { status: "confirmed", label: "Confirm order",    shortLabel: "Confirm",  className: "bg-blue-600 hover:bg-blue-700 text-white" },
    { status: "cancelled", label: "Cancel",           shortLabel: "Cancel",   className: "bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  ],
  confirmed: [
    { status: "preparing", label: "Start preparing",  shortLabel: "Preparing", className: "bg-orange-500 hover:bg-orange-600 text-white" },
    { status: "cancelled", label: "Cancel",           shortLabel: "Cancel",   className: "bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  ],
  preparing: [
    { status: "ready",     label: "Mark ready 🔔",   shortLabel: "Ready!",   className: "bg-emerald-600 hover:bg-emerald-700 text-white" },
  ],
  ready: [
    { status: "served",    label: "Mark served ✓",   shortLabel: "Served",   className: "bg-gray-800 hover:bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900" },
  ],
};

// ─── Order card ───────────────────────────────────────────────────────────────

function OrderCard({ order, index }: { order: OrderWithRelations; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const { mutate: updateStatus, isPending, variables } = useUpdateOrderStatus();
  const items = order.order_items ?? [];
  const style = STATUS_STYLE[order.status];
  const StatusIcon = style.Icon;
  const actions = NEXT_ACTIONS[order.status] ?? [];
  const isDone = order.status === "served" || order.status === "cancelled" || order.status === "paid";

  const itemSummary = items
    .map((i) => `${i.quantity}× ${i.menu_item?.name ?? "item"}`)
    .join(", ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        "overflow-hidden rounded-xl border border-l-4 bg-card shadow-sm transition-shadow hover:shadow-md",
        style.rowBg,
        style.borderColor,
        order.status === "ready" && "shadow-md shadow-emerald-100 dark:shadow-emerald-900/20",
      )}
    >
      {/* ── Main row ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Status icon */}
        <div className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          order.status === "pending" ? "bg-amber-100 dark:bg-amber-900/30"
          : order.status === "ready" ? "bg-emerald-100 dark:bg-emerald-900/30"
          : "bg-muted/60",
        )}>
          <StatusIcon className={cn("h-4 w-4", style.color)} />
        </div>

        {/* Info block */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-bold leading-tight">
              {tableDisplayName(order.table?.label)}
            </span>
            <Badge variant={style.badge} className="shrink-0 text-[10px] px-1.5 py-0 h-4">
              {style.label}
            </Badge>
            {order.status === "ready" && (
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </div>
          {itemSummary && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {itemSummary}
            </p>
          )}
        </div>

        {/* Right: time + amount + expand */}
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-base font-black tabular-nums leading-tight">
            {formatCurrency(order.total)}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {timeAgo(order.created_at)}
          </span>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-1 shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Toggle details"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>

      {/* ── Quick action buttons (always visible for active orders) ── */}
      {!isDone && actions.length > 0 && (
        <div className="flex items-center gap-2 border-t border-dashed px-4 py-2">
          {actions.map((action) => {
            const isUpdating = isPending && variables?.orderId === order.id && variables?.status === action.status;
            const isPrimary = action.status !== "cancelled";
            return (
              <button
                key={action.status}
                disabled={isPending}
                onClick={() => updateStatus({ orderId: order.id, status: action.status })}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-60",
                  isPrimary ? "flex-1" : "",
                  action.className,
                )}
              >
                {isUpdating
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : null
                }
                {action.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Expanded details ───────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <Separator />
            <div className="space-y-1 bg-muted/20 px-4 py-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Order details
              </p>
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
                    <span className="tabular-nums text-muted-foreground ml-4">
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
              <p className="mt-2 text-[10px] text-muted-foreground font-mono opacity-60">
                {order.id}
              </p>
            </div>

            {isDone && (
              <>
                <Separator />
                <div className="px-4 py-2">
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
    </motion.div>
  );
}

// ─── Admin-side countdown after payment ──────────────────────────────────────

const RESET_DELAY = 10; // seconds until table resets on customer side

function PaymentCountdown({ seconds, onCancel }: { seconds: number; onCancel: () => void }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(t);
  }, [remaining]);

  const pct = ((seconds - remaining) / seconds) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-teal-700 dark:text-teal-400">
          ✓ Paid — table resets in {remaining}s
        </span>
        <button
          onClick={onCancel}
          className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
        >
          Undo
        </button>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-teal-500"
          initial={{ width: "0%" }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
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
  // "idle" → "confirm" → "countdown" → "done"
  const [phase, setPhase] = useState<"idle" | "confirm" | "countdown" | "done">("idle");

  const activeOrders = group.orders.filter((o) => !["cancelled", "paid"].includes(o.status));
  const itemCount = activeOrders.reduce(
    (sum, o) => sum + (o.order_items?.reduce((s, i) => s + i.quantity, 0) ?? 0),
    0,
  );

  function handlePay() {
    payTable(group.tableId, {
      onSuccess: (data) => {
        setPhase("countdown");
        toast({
          title: `${tableDisplayName(group.tableLabel)} — Payment received ✓`,
          description: `${data.count} order${data.count > 1 ? "s" : ""} · ${formatCurrency(data.total)}`,
        });
      },
      onError: (err) => {
        setPhase("idle");
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
        (phase === "countdown" || phase === "done") && "border-teal-300 bg-teal-50/40 dark:bg-teal-900/10",
      )}
    >
      {/* Table header */}
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full text-sm font-black",
            phase !== "idle" ? "bg-teal-100 text-teal-700 dark:bg-teal-900/40" : "bg-primary/10 text-primary",
          )}>
            {group.tableLabel}
          </div>
          <div>
            <p className="font-bold">{tableDisplayName(group.tableLabel)}</p>
            <p className="text-xs text-muted-foreground">
              {activeOrders.length} order{activeOrders.length !== 1 ? "s" : ""} · {itemCount} items
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-black tabular-nums">{formatCurrency(group.total)}</p>
          {phase !== "idle" && (
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
              <span className="flex-1 truncate text-xs">
                {order.order_items?.map((i) => `${i.quantity}× ${i.menu_item?.name ?? "item"}`).join(", ")}
              </span>
              <Badge variant={s.badge} className="shrink-0 text-[10px]">{s.label}</Badge>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(order.total)}</span>
            </div>
          );
        })}
      </div>

      {/* Payment action area */}
      <div className="border-t bg-muted/20 px-5 py-3">
        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.button
              key="collect"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setPhase("confirm")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-bold text-white hover:bg-teal-700 active:scale-[0.98] transition-all"
            >
              <Banknote className="h-4 w-4" />
              Collect Payment · {formatCurrency(group.total)}
            </motion.button>
          )}

          {phase === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <p className="flex-1 text-sm font-medium">
                Confirm <span className="font-bold">{formatCurrency(group.total)}</span>?
              </p>
              <button
                onClick={() => setPhase("idle")}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handlePay}
                disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <CheckCircle2 className="h-3.5 w-3.5" />}
                Confirm
              </button>
            </motion.div>
          )}

          {phase === "countdown" && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <PaymentCountdown
                seconds={RESET_DELAY}
                onCancel={() => {
                  // Note: payment is already processed; "undo" only clears the admin UI
                  setPhase("done");
                  toast({ title: "Countdown dismissed", description: "Table will reset shortly on customer devices." });
                }}
              />
            </motion.div>
          )}

          {phase === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-sm font-semibold text-teal-600 dark:text-teal-400"
            >
              <CheckCircle2 className="h-4 w-4" />
              Payment received — table reset sent to customer
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Payment view ─────────────────────────────────────────────────────────────

function PaymentView({ orders }: { orders: OrderWithRelations[] }) {
  const tableMap = new Map<string, TableGroup>();

  for (const order of orders) {
    if (order.status === "cancelled" || order.status === "paid") continue;
    const tableId = order.table_id;
    const tableLabel = order.table?.label ?? "?";
    if (!tableMap.has(tableId)) tableMap.set(tableId, { tableId, tableLabel, orders: [], total: 0 });
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

  const filtered = useMemo(
    () => statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter),
    [orders, statusFilter],
  );

  const counts = useMemo(() => ({
    pending: orders.filter((o) => o.status === "pending").length,
    ready: orders.filter((o) => o.status === "ready").length,
    paid: orders.filter((o) => o.status === "paid").length,
    total: orders.length,
  }), [orders]);

  const totalRevenue = orders.reduce((s, o) => s + (o.total ?? 0), 0);
  const paidRevenue = orders.filter((o) => o.status === "paid").reduce((s, o) => s + (o.total ?? 0), 0);

  const activeTableCount = useMemo(
    () => new Set(orders.filter((o) => !["cancelled", "paid"].includes(o.status)).map((o) => o.table_id)).size,
    [orders],
  );

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="Orders"
        description="Manage order status and collect table payments"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {/* Alert banners */}
      <AnimatePresence>
        {counts.ready > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 dark:bg-emerald-900/20"
          >
            <Bell className="h-4 w-4 text-emerald-600 animate-bounce" />
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              {counts.ready} order{counts.ready > 1 ? "s" : ""} ready to serve!
            </p>
          </motion.div>
        )}
        {counts.pending > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-2 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 dark:bg-amber-900/20"
          >
            <Clock className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {counts.pending} new order{counts.pending > 1 ? "s" : ""} waiting for confirmation
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total orders", value: String(counts.total), sub: `${stats?.ordersToday ?? "—"} today`, icon: ClipboardList },
          { label: "Potential revenue", value: formatCurrency(totalRevenue), sub: "All non-cancelled", icon: TrendingUp },
          { label: "Paid revenue", value: formatCurrency(paidRevenue), sub: `${activeTableCount} active table${activeTableCount !== 1 ? "s" : ""}`, icon: CreditCard },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{card.label}</p>
                  <p className="mt-1 text-xl font-black tabular-nums">{card.value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{card.sub}</p>
                </div>
                <card.icon className="h-5 w-5 text-muted-foreground/40" />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* View tabs */}
      <div className="mt-5 flex gap-1 rounded-xl border bg-muted/40 p-1 w-fit">
        {(["orders", "payment"] as PageView[]).map((v) => (
          <button
            key={v}
            onClick={() => setPageView(v)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors",
              pageView === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v === "orders" ? (
              <><ClipboardList className="h-3.5 w-3.5" /> Orders</>
            ) : (
              <>
                <CreditCard className="h-3.5 w-3.5" /> Payment
                {activeTableCount > 0 && (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-[10px] font-bold text-white">
                    {activeTableCount}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {/* ── ORDERS VIEW ──────────────────────────────────────────────────── */}
      {pageView === "orders" && (
        <>
          {/* Status filter chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => {
              const count = opt.value === "all" ? orders.length : orders.filter((o) => o.status === opt.value).length;
              if (opt.value !== "all" && count === 0) return null;
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
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", statusFilter === opt.value ? "bg-primary-foreground/20" : "bg-muted")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Order list */}
          <div className="mt-3 space-y-2">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
              ))
            ) : filtered.length === 0 ? (
              <EmptyState
                className="mt-8"
                icon={ClipboardList}
                title="No orders"
                description={statusFilter === "all" ? "Orders will appear here when customers place them." : `No ${statusFilter} orders.`}
              />
            ) : (
              filtered.map((order: OrderWithRelations, i) => (
                <OrderCard key={order.id} order={order} index={i} />
              ))
            )}
          </div>
        </>
      )}

      {/* ── PAYMENT VIEW ─────────────────────────────────────────────────── */}
      {pageView === "payment" && (
        <div>
          <p className="mt-4 text-sm text-muted-foreground">
            Select a table to collect payment. Customers will receive a confirmation on their device.
          </p>
          {isLoading ? (
            <div className="mt-4 space-y-4">
              {[1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />)}
            </div>
          ) : (
            <PaymentView orders={orders} />
          )}
        </div>
      )}
    </div>
  );
}
