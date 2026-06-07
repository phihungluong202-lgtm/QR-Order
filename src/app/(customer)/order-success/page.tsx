"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ChefHat,
  Clock,
  CreditCard,
  ShoppingBag,
  UtensilsCrossed,
  Utensils,
  Receipt,
  X,
} from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClientIfConfigured } from "@/lib/supabase/client";
import type { OrderStatus } from "@/types/database";
import { cn, formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";

// ─── Canvas confetti ──────────────────────────────────────────────────────────

function ConfettiBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    const ctxOrNull = canvas.getContext("2d");
    if (!ctxOrNull) return; // guard: some mobile browsers may return null
    const ctx = ctxOrNull; // narrowed to non-null for closures below
    ctx.scale(dpr, dpr);
    const COLORS = ["#ff6b35","#ff9e1b","#ffce00","#00c851","#33b5e5","#aa66cc","#ff4444","#ff69b4"];
    type P = { x:number;y:number;vx:number;vy:number;color:string;r:number;spin:number;dSpin:number;rect:boolean;alpha:number };
    const cx = W*0.5, cy = H*0.22;
    const particles: P[] = Array.from({length:130}, () => {
      const a = Math.random()*Math.PI*2, s = Math.random()*9+3;
      return { x:cx+(Math.random()-0.5)*60, y:cy+(Math.random()-0.5)*40, vx:Math.cos(a)*s, vy:Math.sin(a)*s-4,
        color:COLORS[Math.floor(Math.random()*COLORS.length)], r:Math.random()*5+3,
        spin:Math.random()*Math.PI*2, dSpin:(Math.random()-0.5)*0.35, rect:Math.random()>0.45, alpha:1 };
    });
    let raf: number;
    function draw() {
      ctx.clearRect(0,0,W,H); let alive=false;
      for (const p of particles) {
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.3; p.vx*=0.98; p.spin+=p.dSpin; p.alpha=Math.max(0,p.alpha-0.008);
        if (p.alpha>0.02&&p.y<H+40) alive=true;
        ctx.save(); ctx.globalAlpha=p.alpha; ctx.translate(p.x,p.y); ctx.rotate(p.spin); ctx.fillStyle=p.color;
        if (p.rect) ctx.fillRect(-p.r,-p.r*0.45,p.r*2,p.r*0.9);
        else { ctx.beginPath(); ctx.arc(0,0,p.r*0.7,0,Math.PI*2); ctx.fill(); }
        ctx.restore();
      }
      if (alive) raf=requestAnimationFrame(draw);
    }
    raf=requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50" aria-hidden />;
}

// ─── Status display config (no "confirmed" step shown) ───────────────────────

/** Each "display step" can represent one or more internal statuses */
const DISPLAY_STEPS: {
  statuses: OrderStatus[];
  Icon: React.ElementType;
  label: string;
  desc: string;
}[] = [
  { statuses: ["pending", "confirmed"], Icon: Clock,           label: "Received",  desc: "Waiting for kitchen to prepare" },
  { statuses: ["preparing"],            Icon: ChefHat,         label: "Preparing", desc: "Kitchen is preparing your food 👨‍🍳" },
  { statuses: ["ready"],                Icon: CheckCircle2,    label: "Ready!",    desc: "Your food is ready — enjoy! 🎉" },
  { statuses: ["served"],               Icon: UtensilsCrossed, label: "Served",    desc: "Enjoy your meal!" },
  { statuses: ["paid"],                 Icon: CreditCard,      label: "Paid ✓",   desc: "Payment received — thank you! 🙏" },
];

function displayStepIndex(status: OrderStatus): number {
  return DISPLAY_STEPS.findIndex((step) => step.statuses.includes(status));
}

/** The STATUS_ORDER is kept for internal comparisons */
const STATUS_ORDER: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "served", "paid"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItemLine {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
  imageUrl?: string | null;
}

interface FetchedOrder {
  id: string;
  status: OrderStatus;
  total: number;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    notes?: string | null;
    menu_item?: { name: string; image_url?: string | null } | null;
  }[];
}

// ─── Live table-orders hook ───────────────────────────────────────────────────
// Queries ALL active orders for the current table — no URL orderId needed.

function useTableOrders() {
  const tableId = useCartStore((s) => s.tableId);
  const storeOrders = useCartStore((s) =>
    s.activeOrders.filter((o) => o.tableId === tableId),
  );
  const updateTrackedStatus = useCartStore((s) => s.updateTrackedStatus);

  const [fetched, setFetched] = useState<FetchedOrder[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!tableId) { setLoaded(true); return; }
    const client = createClientIfConfigured();
    if (!client) { setLoaded(true); return; }

    async function fetchOrders() {
      if (!client) return;
      const { data, error } = await client
        .from("orders")
        .select(`
          id, status, total,
          order_items (
            id, quantity, unit_price, notes,
            menu_item:menu_items ( name, image_url )
          )
        `)
        .eq("table_id", tableId!)
        // Exclude terminal statuses — paid/served belong to past sessions
        .not("status", "in", '("cancelled","paid","served")')
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.warn("[order-success] fetch error:", error.message);
        setLoaded(true);
        return;
      }
      if (data) {
        setFetched(data as FetchedOrder[]);
        // Sync statuses back to the global store
        (data as FetchedOrder[]).forEach((o) => updateTrackedStatus(o.id, o.status));
      }
      setLoaded(true);
    }

    fetchOrders();

    // Realtime: listen to any order update for this table
    const channel = client
      .channel(`success-table-${tableId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `table_id=eq.${tableId}` },
        (payload) => {
          const u = payload.new as { id: string; status: OrderStatus };
          if (u?.id && u?.status) {
            updateTrackedStatus(u.id, u.status);
            setFetched((prev) =>
              prev.map((o) => (o.id === u.id ? { ...o, status: u.status } : o)),
            );
          }
        },
      )
      .subscribe();

    // Polling fallback every 8 s
    const poll = setInterval(fetchOrders, 8_000);

    return () => {
      client.removeChannel(channel);
      clearInterval(poll);
    };
  }, [tableId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derive status ──────────────────────────────────────────────────────────
  // Use the most-advanced status between store (realtime) and fetched data.
  const advancedIdx = (status: OrderStatus) => STATUS_ORDER.indexOf(status);

  const fetchedStatus: OrderStatus | null = fetched.length > 0
    ? fetched.reduce<OrderStatus>((best, o) =>
        advancedIdx(o.status) > advancedIdx(best) ? o.status : best,
      "pending")
    : null;

  const storeStatus: OrderStatus | null = storeOrders.length > 0
    ? storeOrders.reduce<OrderStatus>((best, o) =>
        advancedIdx(o.status) > advancedIdx(best) ? o.status : best,
      "pending")
    : null;

  const status: OrderStatus =
    fetchedStatus !== null && storeStatus !== null
      ? advancedIdx(fetchedStatus) >= advancedIdx(storeStatus)
        ? fetchedStatus
        : storeStatus
      : fetchedStatus ?? storeStatus ?? "pending";

  // ── Combine all items from all orders ─────────────────────────────────────
  const allItems: OrderItemLine[] = fetched.flatMap((o) =>
    (o.order_items ?? []).map((oi) => ({
      id: oi.id,
      name: oi.menu_item?.name ?? "Item",
      quantity: oi.quantity,
      unitPrice: oi.unit_price,
      notes: oi.notes,
      imageUrl: oi.menu_item?.image_url,
    })),
  );

  const total = fetched.reduce((sum, o) => sum + (o.total ?? 0), 0);

  return {
    status,
    allItems,
    total,
    loaded,
    tableId,
    hasOrders: storeOrders.length > 0 || fetched.length > 0,
  };
}

// ─── Sticky status bar ────────────────────────────────────────────────────────

function StickyStatusBar({ status }: { status: OrderStatus }) {
  const currentIdx = displayStepIndex(status);
  const currentStep = DISPLAY_STEPS[currentIdx];

  return (
    <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-md shadow-sm">
      {/* Step icons row */}
      <div className="mx-auto flex max-w-sm items-start justify-center px-4 pt-3 pb-1">
        {DISPLAY_STEPS.map((step, i) => {
          const Icon = step.Icon;
          const done  = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={step.label} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {i > 0 && (
                  <div className={cn(
                    "h-[2px] flex-1 transition-colors duration-500",
                    done || active ? "bg-emerald-400 dark:bg-emerald-600" : "bg-muted",
                  )} />
                )}
                <motion.div
                  animate={{ scale: active ? [1, 1.08, 1] : 1 }}
                  transition={{ repeat: active ? Infinity : 0, duration: 1.5, repeatDelay: 0.8 }}
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500",
                    active
                      ? "border-emerald-500 bg-emerald-50 text-emerald-600 shadow-md shadow-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-400"
                      : done
                      ? "border-emerald-400 bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300"
                      : "border-muted bg-muted/30 text-muted-foreground/30",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </motion.div>
                {i < DISPLAY_STEPS.length - 1 && (
                  <div className={cn(
                    "h-[2px] flex-1 transition-colors duration-500",
                    done ? "bg-emerald-400 dark:bg-emerald-600" : "bg-muted",
                  )} />
                )}
              </div>
              <p className={cn(
                "mt-1 px-0.5 text-center text-[9px] font-semibold leading-tight",
                active ? "text-foreground" : "text-muted-foreground/40",
              )}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Status description */}
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 3 }}
          className="mx-auto mb-2.5 max-w-sm px-4"
        >
          <p className={cn(
            "rounded-xl px-4 py-2 text-center text-[11px] font-semibold",
            status === "ready"
              ? "bg-emerald-500 text-white"
              : status === "paid"
              ? "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
          )}>
            {currentStep?.desc ?? "Processing your order…"}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Order items list ─────────────────────────────────────────────────────────

function OrderItemsList({ items, total }: { items: OrderItemLine[]; total: number }) {
  if (items.length === 0) return null;
  return (
    <div className="w-full overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
        <Receipt className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Your order</span>
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {items.reduce((s, i) => s + i.quantity, 0)} items
        </span>
      </div>
      <ul className="divide-y">
        {items.map((item, idx) => (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 + idx * 0.04 }}
            className="flex items-center gap-3 px-4 py-3"
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-muted">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt={item.name} fill sizes="44px" className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Utensils className="h-4 w-4 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {item.quantity}
                </span>
                <p className="truncate text-sm font-medium">{item.name}</p>
              </div>
              {item.notes && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.notes}</p>
              )}
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums">
              {formatCurrency(item.unitPrice * item.quantity)}
            </p>
          </motion.li>
        ))}
      </ul>
      <div className="border-t bg-muted/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total</span>
          <span className="text-base font-extrabold tabular-nums">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

function ItemsSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
        <div className="h-4 w-4 rounded bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-muted" />
          <div className="flex-1"><div className="h-3.5 w-32 animate-pulse rounded bg-muted" /></div>
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
        </div>
      ))}
      <div className="border-t bg-muted/20 px-4 py-3">
        <div className="flex justify-between">
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function NoOrdersState() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Receipt className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">No active orders yet</p>
      <Button size="sm" asChild variant="outline">
        <Link href="/menu">Browse menu</Link>
      </Button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function SuccessContent() {
  const { status, allItems, total, loaded, tableId, hasOrders } = useTableOrders();
  const router = useRouter();
  const clearCart = useCartStore((s) => s.clearCart);
  const removeTrackedOrder = useCartStore((s) => s.removeTrackedOrder);
  const allActiveOrders = useCartStore((s) => s.activeOrders);
  const isCancelled = status === "cancelled";
  const isPaid = status === "paid";

  // Auto-reset: when the table is fully paid, silently clear the session
  // and redirect to a fresh menu so the next customer starts clean.
  // Mirrors the same logic in OrderTracker but works even when the banner
  // is not visible (e.g. customer is already on this page).
  const resetFiredRef = useRef(false);
  useEffect(() => {
    // Fire once when isPaid becomes true and there are tracked orders to clear
    if (!isPaid || !hasOrders || resetFiredRef.current) return;
    resetFiredRef.current = true;
    const timer = setTimeout(() => {
      allActiveOrders
        .filter((o) => o.tableId === tableId)
        .forEach((o) => removeTrackedOrder(o.id));
      clearCart(true); // clears lines, tableOrderId, submittedOrderId
      router.replace(tableId ? `/table/${tableId}` : "/menu");
    }, 10_000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaid]);

  return (
    <div className="flex min-h-dvh flex-col">
      <ConfettiBurst />

      {/* Sticky status bar — always at the top, locked while scrolling */}
      <StickyStatusBar status={status} />

      {/* Scrollable content */}
      <div className="mx-auto w-full max-w-sm flex-1 px-5 pb-32 pt-6">

        {/* Hero icon + title */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 16, delay: 0.1 }}
            className="relative mb-4 flex h-20 w-20 items-center justify-center"
          >
            {!isCancelled && [0,1,2].map((i) => (
              <motion.span
                key={i}
                className={cn("absolute inset-0 rounded-full border-2",
                  isPaid ? "border-teal-400" : "border-emerald-400")}
                initial={{ opacity: 0.7, scale: 1 }}
                animate={{ opacity: 0, scale: 2.5 }}
                transition={{ duration: 1.4, delay: i*0.3+0.2, repeat: Infinity, repeatDelay: 1, ease: "easeOut" }}
              />
            ))}
            <div className={cn("absolute inset-0 rounded-full",
              isCancelled ? "bg-red-50 dark:bg-red-950"
              : isPaid ? "bg-teal-50 dark:bg-teal-950"
              : "bg-emerald-50 dark:bg-emerald-950")} />
            {isCancelled
              ? <X className="relative h-12 w-12 text-red-500" strokeWidth={1.5} />
              : isPaid
              ? <CreditCard className="relative h-12 w-12 text-teal-500" strokeWidth={1.5} />
              : <CheckCircle2 className="relative h-12 w-12 text-emerald-500" strokeWidth={1.5} />}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-2xl font-extrabold tracking-tight"
          >
            {isCancelled ? "Order cancelled" : isPaid ? "Payment received! 🙏" : "Order sent! 🎉"}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-1.5 text-sm text-muted-foreground"
          >
            {isCancelled
              ? "Your order was cancelled."
              : isPaid
              ? "Thank you for dining with us!"
              : "Sit back and relax — we'll bring it right to your table."}
          </motion.p>
        </div>

        {/* Estimated time (pending only) */}
        {!isCancelled && (status === "pending" || status === "confirmed") && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-4 rounded-xl bg-amber-50 px-4 py-2.5 text-center text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
          >
            ⏱ Estimated preparation: 10–20 minutes
          </motion.p>
        )}

        {/* Order items list */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-5"
        >
          {!loaded ? (
            <ItemsSkeleton />
          ) : !hasOrders ? (
            <NoOrdersState />
          ) : (
            <OrderItemsList items={allItems} total={total} />
          )}
        </motion.div>

        {/* Actions */}
        {hasOrders && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-6 flex flex-col gap-3"
          >
            <Button size="lg" className="press h-12 w-full shadow-md shadow-primary/20" asChild>
              <Link href="/menu">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Order more items
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
              <Link href="/menu">Back to menu</Link>
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
