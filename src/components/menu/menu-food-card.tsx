"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, Trash2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { MenuItemImage } from "@/components/menu/menu-item-image";
import { useCartStore } from "@/stores/cart-store";
import type { MenuItem } from "@/types/database";
import { cn } from "@/lib/utils";

interface MenuFoodCardProps {
  item: MenuItem;
  index?: number;
  onOpenDetail: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem, buttonEl: HTMLButtonElement | null) => void;
}

export function MenuFoodCard({
  item,
  index = 0,
  onOpenDetail,
  onQuickAdd,
}: MenuFoodCardProps) {
  const line = useCartStore((s) => s.lines.find((l) => l.menuItem.id === item.id));
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const unavailable = !item.is_available;
  const inCart = !unavailable && line && line.quantity > 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.3, ease: "easeOut" }}
      className={cn(
        "card-lift overflow-hidden rounded-2xl border bg-card shadow-sm touch-manipulation",
        unavailable && "opacity-70",
      )}
    >
      {/* Image + tap target */}
      <button
        type="button"
        className="press block w-full text-left"
        onClick={() => onOpenDetail(item)}
        disabled={unavailable}
        aria-label={`View details for ${item.name}`}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          <MenuItemImage
            item={item}
            className="absolute inset-0 h-full w-full transition-transform duration-300 hover:scale-105"
            sizes="(max-width: 512px) 90vw, 400px"
          />

          {/* Unavailable overlay */}
          {unavailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
              <Badge variant="secondary" className="gap-1 bg-background/90 shadow-sm">
                <AlertCircle className="h-3 w-3" />
                Unavailable
              </Badge>
            </div>
          )}

          {/* Cart quantity badge */}
          <AnimatePresence>
            {inCart && (
              <motion.span
                key="badge"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute right-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/30"
              >
                {line!.quantity}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Card body */}
        <div className="px-3.5 pt-3 pb-2">
          <h3 className="font-semibold leading-snug text-[15px]">{item.name}</h3>
          {item.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          )}
          <p className="mt-2 text-base font-bold text-primary">
            {formatCurrency(Number(item.price))}
          </p>
        </div>
      </button>

      {/* Card footer — Add or Qty controls */}
      {!unavailable && (
        <div className="border-t px-3 py-2.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {inCart ? (
              /* ── Quantity controls ─────────────────────────────── */
              <motion.div
                key="qty"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="flex items-center justify-between gap-2"
              >
                <button
                  type="button"
                  className="press flex h-9 w-9 items-center justify-center rounded-xl border bg-muted/60 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => updateQuantity(item.id, line!.quantity - 1)}
                  aria-label={line!.quantity === 1 ? "Remove from cart" : "Decrease quantity"}
                >
                  {line!.quantity === 1 ? (
                    <Trash2 className="h-4 w-4" />
                  ) : (
                    <Minus className="h-4 w-4" />
                  )}
                </button>

                {/* Animated count */}
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={line!.quantity}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="min-w-[2rem] text-center text-base font-bold tabular-nums"
                  >
                    {line!.quantity}
                  </motion.span>
                </AnimatePresence>

                <button
                  type="button"
                  className="press flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30 transition-colors hover:bg-primary/90"
                  onClick={(e) => onQuickAdd(item, e.currentTarget)}
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </motion.div>
            ) : (
              /* ── Add to cart button ─────────────────────────────── */
              <motion.div
                key="add"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="press h-10 w-full gap-2 rounded-xl font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickAdd(item, e.currentTarget);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add to cart
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.article>
  );
}
