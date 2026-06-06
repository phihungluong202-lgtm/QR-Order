"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";

export function MenuFloatingCart() {
  const count = useCartStore((s) => s.itemCount());
  const subtotal = useCartStore((s) => s.subtotal());

  // Pulse the button whenever an item is added
  const prevCount = useRef(count);
  const [didAdd, setDidAdd] = useState(false);

  useEffect(() => {
    if (count > prevCount.current) {
      setDidAdd(true);
      const t = setTimeout(() => setDidAdd(false), 500);
      prevCount.current = count;
      return () => clearTimeout(t);
    }
    prevCount.current = count;
  }, [count]);

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 28, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="fixed bottom-[4.5rem] left-4 right-4 z-40 mx-auto max-w-lg md:bottom-6"
        >
          <motion.div
            animate={didAdd ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <Link
              href="/cart"
              className="flex h-14 w-full items-center justify-between rounded-2xl gradient-brand px-5 shadow-xl shadow-black/20 touch-manipulation"
              aria-label={`View cart — ${count} item${count !== 1 ? "s" : ""}, ${formatCurrency(subtotal)}`}
            >
              {/* Left: icon + item count */}
              <span className="flex items-center gap-2.5 text-brand-foreground">
                <span className="relative">
                  <ShoppingBag className="h-5 w-5" />
                  {/* Item count bubble */}
                  <AnimatePresence>
                    <motion.span
                      key={count}
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white/30 px-1 text-[10px] font-black text-white"
                    >
                      {count}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <span className="font-semibold text-brand-foreground">
                  View cart
                </span>
              </span>

              {/* Right: total */}
              <span className="font-bold text-brand-foreground">
                {formatCurrency(subtotal)}
              </span>
            </Link>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
