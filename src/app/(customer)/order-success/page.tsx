"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Clock,
  CreditCard,
  ShoppingBag,
  UtensilsCrossed,
  X,
  Utensils,
  Receipt,
} from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClientIfConfigured } from "@/lib/supabase/client";
import type { OrderStatus } from "@/types/database";
import { cn, formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";

// ─── Canvas confetti burst ────────────────────────────────────────────────────

function ConfettiBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const COLORS = [
      "#ff6b35", "#ff9e1b", "#ffce00", "#00c851",
      "#33b5e5", "#aa66cc", "#ff4444", "#ff69b4",
    ];

    type Particle = {
      x: number; y: number;
      vx: number; vy: number;
      color: string; r: number;
      spin: number; dSpin: number;
      rect: boolean; alpha: number;
    };

    const cx = W * 0.5;
    const cy = H * 0.22;

    const particles: Particle[] = Array.from({ length: 130 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 9 + 3;
      return {
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        r: Math.random() * 5 + 3,
        spin: Math.random() * Math.PI * 2,
        dSpin: (Math.random() - 0.5) * 0.35,
        rect: Math.random() > 0.45,
        alpha: 1,
      };
    });

    let raf: number;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.3; p.vx *= 0.98;
        p.spin += p.dSpin;
        p.alpha = Math.max(0, p.alpha - 0.008);
        if (p.alpha > 0.02 && p.y < H + 40) alive = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        ctx.fillStyle = p.color;
        if (p.rect) ctx.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9);
        else { ctx.beginPath(); ctx.arc(0, 0, p.r * 0.7, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      if (alive) raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50" aria-hidden="true" />
  );
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STEPS: {
  status: OrderStatus;
  Icon: React.ElementType;
  label: string;
  desc: string;
}[] = [
  { status: "pending",   Icon: Clock,           label: "Received",   desc: "Waiting for kitchen to confirm" },
  { status: "confirmed", Icon: ClipboardList,   label: "Confirmed",  desc: "Kitchen acknowledged your order" },
  { status: "preparing", Icon: ChefHat,         label: "Preparing",  desc: "Kitchen is preparing your food" },
  { status: "ready",     Icon: CheckCircle2,    label: "Ready!",     desc: "Your food is ready — enjoy! 🎉" },
  { status: "served",    Icon: UtensilsCrossed, label: "Served",     desc: "Enjoy your meal!" },
  { status: "paid",      Icon: CreditCard,      label: "Paid ✓",    desc: "Payment received — thank you! 🙏" },
];

const STATUS_ORDER: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "served", "paid"];

function statusIndex(s: OrderStatus) {
  return STATUS_ORDER.indexOf(s);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItemLine {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
  imageUrl?: string | null;
}

// ─── Live order hook ──────────────────────────────────────────────────────────

function useLiveOrder(orderId: string | null) {
  const [fetchedStatus, setFetchedStatus] = useState<OrderStatus | null>(null);
  const [items, setItems] = useState<OrderItemLine[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);
  const updateTrackedStatus = useCartStore((s) => s.updateTrackedStatus);
  // Read the live status from the Zustand store (updated by order-tracker realtime subscription)
  const storeStatus = useCartStore((s) =>
    s.activeOrders.find((o) => o.id === orderId)?.status ?? null,
  );

  // The effective status: prefer the most recent between fetched and store
  const effectiveStatus: OrderStatus =
    fetchedStatus !== null && storeStatus !== null
      ? STATUS_ORDER.indexOf(fetchedStatus) >= STATUS_ORDER.indexOf(storeStatus)
        ? fetchedStatus
        : storeStatus
      : fetchedStatus ?? storeStatus ?? "pending";

  useEffect(() => {
    if (!orderId || orderId === "unknown") { setLoaded(true); return; }

    const client = createClientIfConfigured();
    if (!client) { setLoaded(true); return; }

    async function fetchOrder() {
      if (!client) return;
      const { data, error } = await client
        .from("orders")
        .select(`
          status,
          total,
          order_items (
            id,
            quantity,
            unit_price,
            notes,
            menu_item:menu_items ( name, image_url )
          )
        `)
        .eq("id", orderId!)
        .is("deleted_at", null)
        .single();

      if (error) {
        console.warn("[order-success] fetch error:", error.message);
        setLoaded(true);
        return;
      }

      if (data) {
        const latest = data.status as OrderStatus;
        setFetchedStatus(latest);
        setTotal(data.total ?? 0);
        if (orderId) updateTrackedStatus(orderId, latest);
        const lines: OrderItemLine[] = (data.order_items ?? []).map((oi: {
          id: string;
          quantity: number;
          unit_price: number;
          notes?: string | null;
          menu_item?: { name: string; image_url?: string | null } | null;
        }) => ({
          id: oi.id,
          name: oi.menu_item?.name ?? "Item",
          quantity: oi.quantity,
          unitPrice: oi.unit_price,
          notes: oi.notes,
          imageUrl: oi.menu_item?.image_url,
        }));
        setItems(lines);
      }
      setLoaded(true);
    }

    fetchOrder();

    // Realtime subscription for instant status push
    const channel = client
      .channel(`order-success-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => {
          const newStatus = (payload.new as { status: OrderStatus }).status;
          if (newStatus) {
            setFetchedStatus(newStatus);
            if (orderId) updateTrackedStatus(orderId, newStatus);
          }
        },
      )
      .subscribe();

    // Polling fallback every 8 s
    const poll = setInterval(() => { fetchOrder(); }, 8_000);

    return () => {
      client.removeChannel(channel);
      clearInterval(poll);
    };
  }, [orderId]);  // eslint-disable-line react-hooks/exhaustive-deps

  return { status: effectiveStatus, items, total, loaded };
}

// ─── Sticky status bar ────────────────────────────────────────────────────────

function StickyStatusBar({ status }: { status: OrderStatus }) {
  const currentIdx = statusIndex(status);
  const steps = STATUS_STEPS.filter((s) => s.status !== "cancelled");
  const currentStep = STATUS_STEPS.find((s) => s.status === status);

  return (
    <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-md px-4 pt-safe-top shadow-sm">
      {/* Step icons */}
      <div className="mx-auto flex max-w-sm items-start justify-center py-3">
        {steps.map((step, i) => {
          const Icon = step.Icon;
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={step.status} className="flex flex-1 flex-col items-center">
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
                {i < steps.length - 1 && (
                  <div className={cn(
                    "h-[2px] flex-1 transition-colors duration-500",
                    done ? "bg-emerald-400 dark:bg-emerald-600" : "bg-muted",
                  )} />
                )}
              </div>
              <p className={cn(
                "mt-1 px-0.5 text-center text-[9px] font-semibold leading-tight tracking-tight",
                active ? "text-foreground" : "text-muted-foreground/50",
              )}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Status description pill */}
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          className="mx-auto mb-3 max-w-sm"
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
      {/* Header */}
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
        <Receipt className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Your order</span>
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          {items.reduce((s, i) => s + i.quantity, 0)} items
        </span>
      </div>

      {/* Items */}
      <ul className="divide-y">
        {items.map((item, idx) => (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + idx * 0.05 }}
            className="flex items-center gap-3 px-4 py-3"
          >
            {/* Thumbnail */}
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-muted">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  sizes="44px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Utensils className="h-4 w-4 text-muted-foreground/40" />
                </div>
              )}
            </div>

            {/* Name + notes */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {item.quantity}
                </span>
                <p className="truncate text-sm font-medium">{item.name}</p>
              </div>
              {item.notes && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {item.notes}
                </p>
              )}
            </div>

            {/* Price */}
            <p className="shrink-0 text-sm font-semibold tabular-nums">
              {formatCurrency(item.unitPrice * item.quantity)}
            </p>
          </motion.li>
        ))}
      </ul>

      {/* Total */}
      <div className="border-t bg-muted/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total</span>
          <span className="text-base font-extrabold tabular-nums text-foreground">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ItemsSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3">
        <div className="h-4 w-4 rounded bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="h-11 w-11 shrink-0 rounded-xl bg-muted animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-32 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-4 w-12 rounded bg-muted animate-pulse" />
        </div>
      ))}
      <div className="border-t bg-muted/20 px-4 py-3">
        <div className="flex justify-between">
          <div className="h-4 w-12 rounded bg-muted animate-pulse" />
          <div className="h-4 w-20 rounded bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function SuccessContent() {
  const params = useSearchParams();
  const rawOrderId = params.get("orderId");
  // Fallback to the last submitted orderId from the store if URL param is missing
  const submittedOrderId = useCartStore((s) => s.submittedOrderId);
  const orderId = rawOrderId ?? submittedOrderId;

  const { status, items, total, loaded } = useLiveOrder(orderId);
  const isCancelled = status === "cancelled";
  const isPaid = status === "paid";

  return (
    <div className="flex min-h-dvh flex-col">
      <ConfettiBurst />

      {/* ── Sticky status bar at the very top ──────────────────────────── */}
      {!isCancelled && (
        <StickyStatusBar status={status} />
      )}

      {/* ── Scrollable body ─────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-sm flex-1 px-5 pb-32 pt-6">

        {/* Hero */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 16, delay: 0.1 }}
            className="relative mb-4 flex h-20 w-20 items-center justify-center"
          >
            {!isCancelled && [0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className={cn(
                  "absolute inset-0 rounded-full border-2",
                  isPaid ? "border-teal-400" : "border-emerald-400",
                )}
                initial={{ opacity: 0.7, scale: 1 }}
                animate={{ opacity: 0, scale: 2.5 }}
                transition={{ duration: 1.4, delay: i * 0.3 + 0.2, repeat: Infinity, repeatDelay: 1, ease: "easeOut" }}
              />
            ))}
            <div className={cn(
              "absolute inset-0 rounded-full",
              isCancelled ? "bg-red-50 dark:bg-red-950"
              : isPaid ? "bg-teal-50 dark:bg-teal-950"
              : "bg-emerald-50 dark:bg-emerald-950",
            )} />
            {isCancelled
              ? <X className="relative h-12 w-12 text-red-500" strokeWidth={1.5} />
              : isPaid
              ? <CreditCard className="relative h-12 w-12 text-teal-500" strokeWidth={1.5} />
              : <CheckCircle2 className="relative h-12 w-12 text-emerald-500" strokeWidth={1.5} />
            }
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
              ? "Your order was cancelled. Please place a new order."
              : isPaid
              ? "Thank you for dining with us. See you again soon!"
              : "Sit back and relax — we'll bring it right to your table."}
          </motion.p>

          {orderId && orderId !== "unknown" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45, type: "spring" }}
              className="mt-2.5 rounded-full bg-muted px-4 py-1 text-xs font-mono font-semibold text-muted-foreground"
            >
              Order #{orderId.slice(0, 8).toUpperCase()}
            </motion.div>
          )}
        </div>

        {/* ── Order items ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-5"
        >
          {!loaded ? (
            <ItemsSkeleton />
          ) : (
            <OrderItemsList items={items} total={total} />
          )}
        </motion.div>

        {/* ── Estimated time ────────────────────────────────────────────── */}
        {!isCancelled && status === "pending" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-center text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
          >
            ⏱ Estimated preparation: 10–20 minutes
          </motion.p>
        )}

        {/* ── Actions ───────────────────────────────────────────────────── */}
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
