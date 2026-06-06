"use client";

import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MenuItemImage } from "@/components/menu/menu-item-image";
import { QuantitySelector } from "@/components/menu/quantity-selector";
import { formatCurrency } from "@/lib/utils";
import type { MenuItem } from "@/types/database";

interface MenuItemDetailModalProps {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (
    item: MenuItem,
    options: { quantity: number; notes?: string },
    buttonEl: HTMLButtonElement | null,
  ) => void;
}

export function MenuItemDetailModal({
  item,
  open,
  onOpenChange,
  onAdd,
}: MenuItemDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && item) {
      setQuantity(1);
      setNotes("");
    }
  }, [open, item?.id, item]);

  const unavailable = item ? !item.is_available : false;

  return (
    <AnimatePresence>
      {open && item && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
            aria-hidden="true"
          />

          {/* Bottom sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.6 }}
            transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.9 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg overflow-hidden rounded-t-3xl bg-card shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={item.name}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>

            {/* Close button */}
            <button
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-colors hover:bg-muted"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Food image */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
              <MenuItemImage item={item} className="absolute inset-0 h-full w-full" priority />
              {unavailable && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/75 backdrop-blur-sm">
                  <Badge variant="secondary" className="gap-1 shadow-sm">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Currently unavailable
                  </Badge>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-extrabold tracking-tight leading-tight">{item.name}</h2>
                <p className="shrink-0 text-xl font-extrabold text-primary">
                  {formatCurrency(Number(item.price))}
                </p>
              </div>

              {item.description && (
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              )}
            </div>

            {/* Options */}
            <div className="space-y-4 px-5 py-3">
              {/* Quantity */}
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Quantity</Label>
                <QuantitySelector
                  value={quantity}
                  onChange={setQuantity}
                  min={1}
                  max={20}
                />
              </div>

              {/* Special instructions */}
              <div className="space-y-1.5">
                <Label htmlFor="item-notes" className="text-sm font-semibold">
                  Special instructions
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
                </Label>
                <textarea
                  id="item-notes"
                  rows={2}
                  placeholder="e.g. no peanuts, extra spicy…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={unavailable}
                  className="w-full resize-none rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none ring-primary/30 placeholder:text-muted-foreground/50 transition-shadow focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            {/* Sticky add button — safe area for home indicator */}
            <div className="sticky bottom-0 safe-bottom bg-card px-5 pt-2 pb-4 border-t border-border/50">
              <Button
                type="button"
                size="lg"
                className="press h-12 w-full rounded-xl shadow-md shadow-primary/20"
                disabled={unavailable}
                onClick={(e) => {
                  onAdd(
                    item,
                    { quantity, notes: notes.trim() || undefined },
                    e.currentTarget,
                  );
                  onOpenChange(false);
                }}
              >
                {unavailable
                  ? "Unavailable"
                  : `Add ${quantity > 1 ? `${quantity} × ` : ""}${item.name} · ${formatCurrency(Number(item.price) * quantity)}`}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
