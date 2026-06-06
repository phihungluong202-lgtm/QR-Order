"use client";

import { CustomerBottomNav } from "@/components/layout/customer-bottom-nav";
import { AddToCartBurstProvider } from "@/components/menu/add-to-cart-burst";

export function CustomerShell({ children }: { children: React.ReactNode }) {
  return (
    <AddToCartBurstProvider>
      <div className="min-h-dvh pb-20 md:pb-0">
        {children}
        <CustomerBottomNav />
      </div>
    </AddToCartBurstProvider>
  );
}
