"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Receipt,
  ScanLine,
  Utensils,
} from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { useSubmitOrder } from "@/hooks/use-submit-order";

// ─── Step indicator ───────────────────────────────────────────────────────────

function CheckoutSteps({ step }: { step: 1 | 2 }) {
  const steps = ["Review", "Confirm"];
  return (
    <div className="flex items-center gap-1.5" aria-label="Checkout progress">
      {steps.map((label, i) => {
        const done = i + 1 < step;
        const active = i + 1 === step;
        return (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                done
                  ? "bg-emerald-500 text-white"
                  : active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <div className="h-px w-6 bg-border" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const lines = useCartStore((s) => s.lines);
  const tableId = useCartStore((s) => s.tableId);
  const subtotal = useCartStore((s) => s.subtotal());

  const [orderNotes, setOrderNotes] = useState("");
  const { submit, isPending, isError, error, canSubmit } = useSubmitOrder();

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-5 safe-top">
        <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Checkout</h1>
        <EmptyState
          icon={Receipt}
          title="Nothing to checkout"
          description="Add items from the menu first."
          action={
            <Button asChild>
              <Link href="/menu">Go to menu</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-40 pt-5 safe-top">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Checkout</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {tableId ? "Review your order" : "Link your table first"}
          </p>
        </div>
        <CheckoutSteps step={1} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        {/* ── Table warning ────────────────────────────────────────────── */}
        <AnimatePresence>
          {!tableId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400"
            >
              <ScanLine className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">No table detected</p>
                <p className="text-xs opacity-80 mt-0.5">
                  Scan the QR code at your table before placing an order.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Order items ──────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Your order</h2>
          </div>

          <ul className="divide-y">
            {lines.map((line, i) => (
              <motion.li
                key={line.menuItem.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 px-4 py-3"
              >
                {/* Thumbnail */}
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {line.menuItem.image_url ? (
                    <Image
                      src={line.menuItem.image_url}
                      alt={line.menuItem.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Utensils className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  )}
                </div>

                {/* Qty badge + name */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {line.quantity}
                    </span>
                    <p className="truncate text-sm font-medium">{line.menuItem.name}</p>
                  </div>
                  {line.notes && (
                    <p className="mt-0.5 truncate text-xs italic text-muted-foreground">
                      {line.notes}
                    </p>
                  )}
                </div>

                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCurrency(line.menuItem.price * line.quantity)}
                </span>
              </motion.li>
            ))}
          </ul>

          <Separator />

          {/* Totals */}
          <div className="space-y-1.5 px-4 py-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-lg tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
          </div>
        </div>

        {/* ── Special requests ─────────────────────────────────────────── */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <label htmlFor="order-notes" className="mb-2 block text-sm font-semibold">
            Special requests
            <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="order-notes"
            rows={3}
            className="w-full resize-none rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none ring-primary/30 placeholder:text-muted-foreground/50 transition-shadow focus:ring-2 disabled:opacity-50"
            placeholder="Allergy info, no rush, extra napkins…"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            disabled={isPending}
          />
        </div>

        {/* ── Back link ────────────────────────────────────────────────── */}
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link href="/cart">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Edit cart
          </Link>
        </Button>

        {/* ── Error ────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {isError && error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Submit ───────────────────────────────────────────────────── */}
        <Button
          className="press h-12 w-full shadow-md shadow-primary/20"
          size="lg"
          disabled={!canSubmit || isPending}
          onClick={() => submit(orderNotes)}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Placing order…
            </>
          ) : (
            `Place order · ${formatCurrency(subtotal)}`
          )}
        </Button>

        {!tableId && (
          <p className="text-center text-xs text-muted-foreground">
            You must scan your table QR code before placing an order.
          </p>
        )}
      </motion.div>
    </div>
  );
}
