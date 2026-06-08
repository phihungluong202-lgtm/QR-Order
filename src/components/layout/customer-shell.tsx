"use client";

import { CustomerBottomNav } from "@/components/layout/customer-bottom-nav";
import { AddToCartBurstProvider } from "@/components/menu/add-to-cart-burst";
import { OrderTracker } from "@/components/customer/order-tracker";
import { useActiveOrderCount } from "@/components/customer/order-tracker";
import {
  TableSessionNotice,
  useTableSessionLifecycle,
} from "@/hooks/use-table-session-lifecycle";

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const hasActiveOrders = useActiveOrderCount() > 0;
  const sessionNotice = useTableSessionLifecycle();
  const hasTopOffset = hasActiveOrders || !!sessionNotice;

  return (
    <AddToCartBurstProvider>
      {sessionNotice && <TableSessionNotice reason={sessionNotice} />}
      {/* Order tracker banner sticks to top */}
      <OrderTracker />

      {/* Push content below banner when it's visible */}
      <div
        className={`min-h-dvh pb-20 md:pb-0 transition-[padding-top] duration-300 ${
          hasTopOffset ? (sessionNotice ? "pt-[4.5rem]" : "pt-10") : "pt-0"
        }`}
      >
        {children}
      </div>

      <CustomerBottomNav />
    </AddToCartBurstProvider>
  );
}
