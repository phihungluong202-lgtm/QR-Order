"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, ShoppingBag, Receipt, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { useActiveOrderCount, useHasReadyOrder } from "@/components/customer/order-tracker";

export function CustomerBottomNav() {
  const pathname = usePathname();
  const itemCount = useCartStore((s) => s.itemCount());
  const activeOrderCount = useActiveOrderCount();
  const hasReadyOrder = useHasReadyOrder();
  // Pass the last submitted orderId so the success page always loads with correct data
  const submittedOrderId = useCartStore((s) => s.submittedOrderId);
  const ordersHref = submittedOrderId
    ? `/order-success?orderId=${submittedOrderId}`
    : "/order-success";

  const navItems = [
    { href: "/menu", label: "Menu", icon: Home, badge: 0 },
    { href: "/cart", label: "Cart", icon: ShoppingBag, badge: itemCount },
    { href: ordersHref, label: "Orders", icon: ClipboardList, badge: activeOrderCount, pulse: hasReadyOrder },
    { href: "/checkout", label: "Checkout", icon: Receipt, badge: 0 },
  ] as const;

  return (
    <nav
      className="glass safe-bottom fixed bottom-0 left-0 right-0 z-50 border-t md:hidden"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {navItems.map(({ href, label, icon: Icon, badge, ...rest }) => {
          const pulse = "pulse" in rest ? rest.pulse : false;
          const baseHref = href.split("?")[0]; // strip query string for active check
          const active =
            pathname.startsWith(baseHref) ||
            (baseHref === "/menu" &&
              (pathname.startsWith("/table") || pathname.startsWith("/t/")));
          const showBadge = badge > 0;

          return (
            <Link
              key={baseHref}
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
                    pulse && !active && "text-emerald-500",
                  )}
                />

                {/* Badge */}
                <AnimatePresence>
                  {showBadge && (
                    <motion.span
                      key={badge}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      className={cn(
                        "absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-black shadow-sm",
                        pulse
                          ? "animate-bounce bg-emerald-500 text-white"
                          : "bg-primary text-primary-foreground",
                      )}
                    >
                      {badge > 9 ? "9+" : badge}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.span>

              {/* Label */}
              <span
                className={cn(
                  "text-[11px] font-semibold leading-none tracking-tight transition-colors",
                  active ? "text-primary" : "text-muted-foreground/70",
                  pulse && !active && "text-emerald-500",
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
