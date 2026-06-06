"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, ShoppingBag, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";

const navItems = [
  { href: "/menu", label: "Menu", icon: Home },
  { href: "/cart", label: "Cart", icon: ShoppingBag },
  { href: "/checkout", label: "Checkout", icon: Receipt },
] as const;

export function CustomerBottomNav() {
  const pathname = usePathname();
  const itemCount = useCartStore((s) => s.itemCount());

  return (
    <nav
      className="glass safe-bottom fixed bottom-0 left-0 right-0 z-50 border-t md:hidden"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname.startsWith(href) ||
            (href === "/menu" &&
              (pathname.startsWith("/table") || pathname.startsWith("/t/")));
          const showBadge = href === "/cart" && itemCount > 0;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "press relative flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors",
                active ? "text-primary" : "text-muted-foreground/70",
              )}
              aria-current={active ? "page" : undefined}
            >
              {/* Active indicator pill */}
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-x-3 -top-0.5 h-[3px] rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                />
              )}

              {/* Icon with scale on active */}
              <motion.span
                className="relative"
                animate={{ scale: active ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] transition-[stroke-width]",
                    active ? "stroke-[2.2px]" : "stroke-[1.8px]",
                  )}
                />

                {/* Cart badge */}
                <AnimatePresence>
                  {showBadge && (
                    <motion.span
                      key={itemCount}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground shadow-sm"
                    >
                      {itemCount > 9 ? "9+" : itemCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.span>

              {/* Label */}
              <span
                className={cn(
                  "text-[11px] font-semibold leading-none tracking-tight transition-colors",
                  active ? "text-primary" : "text-muted-foreground/70",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
