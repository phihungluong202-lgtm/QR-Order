"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Minus,
  MessageSquare,
  Plus,
  ShoppingBag,
  Trash2,
  Utensils,
} from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";

// ─── Cart item row ────────────────────────────────────────────────────────────

function CartItemRow({
  line,
  onInc,
  onDec,
  onNoteChange,
}: {
  line: { menuItem: { id: string; name: string; price: number; image_url: string | null; description: string | null }; quantity: number; notes?: string };
  onInc: () => void;
  onDec: () => void;
  onNoteChange: (note: string) => void;
}) {
  const [showNote, setShowNote] = useState(!!line.notes);
  const lineTotal = line.menuItem.price * line.quantity;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.22 }}
      className="overflow-hidden rounded-2xl border bg-card shadow-sm"
    >
      {/* Main row */}
      <div className="flex items-start gap-3 p-3.5">
        {/* Thumbnail */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
          {line.menuItem.image_url ? (
            <Image
              src={line.menuItem.image_url}
              alt={line.menuItem.name}
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl">
              <Utensils className="h-7 w-7 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Name + price */}
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug text-[15px]">{line.menuItem.name}</p>
          <div className="mt-1 flex items-baseline gap-1.5 text-sm">
            <span className="text-muted-foreground">{formatCurrency(line.menuItem.price)}</span>
            <span className="text-muted-foreground/50">×</span>
            <span className="text-muted-foreground">{line.quantity}</span>
            <span className="text-muted-foreground/50">=</span>
            <span className="font-bold text-foreground">{formatCurrency(lineTotal)}</span>
          </div>

          {/* Notes toggle */}
          <button
            className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setShowNote((v) => !v)}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {line.notes ? "Edit note" : "Add note"}
          </button>
        </div>

        {/* Quantity controls */}
        <div className="flex shrink-0 items-center gap-1 rounded-xl border bg-muted/50 px-1 py-0.5">
          <button
            className="press flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            onClick={onDec}
            aria-label={line.quantity === 1 ? "Remove item" : "Decrease quantity"}
          >
            {line.quantity === 1 ? (
              <Trash2 className="h-3.5 w-3.5" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
          </button>

          <AnimatePresence mode="popLayout">
            <motion.span
              key={line.quantity}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="w-6 text-center text-sm font-bold tabular-nums"
            >
              {line.quantity}
            </motion.span>
          </AnimatePresence>

          <button
            className="press flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            onClick={onInc}
            aria-label="Increase quantity"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Notes area */}
      <AnimatePresence>
        {showNote && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t bg-muted/20 px-3.5 py-3"
          >
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Note for kitchen
            </p>
            <textarea
              className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none ring-ring transition-shadow focus:ring-2 focus:ring-ring/30"
              rows={2}
              placeholder="e.g. No onions, extra spicy…"
              defaultValue={line.notes ?? ""}
              onBlur={(e) => onNoteChange(e.target.value)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CartPage() {
  const lines = useCartStore((s) => s.lines);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const updateLineNotes = useCartStore((s) => s.updateLineNotes);
  const subtotal = useCartStore((s) => s.subtotal());
  const itemCount = useCartStore((s) => s.itemCount());

  const isEmpty = lines.length === 0;

  return (
    <>
      {/* ── Scrollable content ──────────────────────────────────────────── */}
      <div className={`mx-auto max-w-lg px-4 safe-top ${isEmpty ? "py-5" : "pb-52 pt-5"}`}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight">Your cart</h1>
          {!isEmpty && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {itemCount} item{itemCount !== 1 ? "s" : ""} — review before checkout
            </p>
          )}
        </div>

        {/* Empty state */}
        {isEmpty ? (
          <EmptyState
            icon={ShoppingBag}
            title="Cart is empty"
            description="Browse the menu and tap Add to cart on any dish."
            action={
              <Button asChild size="lg">
                <Link href="/menu">Browse menu</Link>
              </Button>
            }
          />
        ) : (
          <>
            {/* Item list */}
            <ul className="space-y-3">
              <AnimatePresence mode="popLayout">
                {lines.map((line) => (
                  <CartItemRow
                    key={line.menuItem.id}
                    line={line}
                    onInc={() => updateQuantity(line.menuItem.id, line.quantity + 1)}
                    onDec={() => updateQuantity(line.menuItem.id, line.quantity - 1)}
                    onNoteChange={(note) => updateLineNotes(line.menuItem.id, note)}
                  />
                ))}
              </AnimatePresence>
            </ul>

            {/* Order breakdown */}
            <motion.div layout className="mt-5 rounded-2xl border bg-muted/30 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Order summary
              </p>

              <div className="space-y-2">
                {lines.map((line) => (
                  <div
                    key={line.menuItem.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate text-muted-foreground">
                      {line.menuItem.name}
                      <span className="ml-1 text-xs opacity-70">× {line.quantity}</span>
                    </span>
                    <span className="ml-4 shrink-0 font-medium tabular-nums">
                      {formatCurrency(line.menuItem.price * line.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator className="my-3" />

              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-extrabold tabular-nums">
                  {formatCurrency(subtotal)}
                </span>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* ── Sticky checkout panel (visible when cart has items) ──────────── */}
      <AnimatePresence>
        {!isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="fixed bottom-[4rem] left-0 right-0 z-30 md:bottom-0"
          >
            <div className="mx-auto max-w-lg">
              <div className="mx-3 rounded-2xl border bg-card/95 px-4 pb-3 pt-3 shadow-xl shadow-black/10 backdrop-blur-xl md:mx-0 md:rounded-none md:border-x-0 md:border-b-0 md:shadow-none">
                {/* Total row */}
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {itemCount} item{itemCount !== 1 ? "s" : ""}
                  </span>
                  <span className="text-lg font-extrabold tabular-nums">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                {/* Checkout CTA */}
                <Button
                  asChild
                  size="lg"
                  className="press h-12 w-full rounded-xl shadow-md shadow-primary/25"
                >
                  <Link href="/checkout">
                    Proceed to checkout
                    <ChevronRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
