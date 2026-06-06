"use client";

import { motion } from "framer-motion";
import { UtensilsCrossed } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrdersRealtime } from "@/hooks/use-orders-realtime";
import { useKitchenOrders, useUpdateOrderStatus } from "@/hooks/use-orders";
import { formatCurrency } from "@/lib/utils";
import { DEMO_RESTAURANT_ID } from "@/lib/constants";
import type { OrderWithRelations } from "@/types/database";

export default function WaiterDashboardPage() {
  useOrdersRealtime(DEMO_RESTAURANT_ID);

  const { data, isLoading } = useKitchenOrders(DEMO_RESTAURANT_ID);
  const mutation = useUpdateOrderStatus(DEMO_RESTAURANT_ID);

  const readyOrders = (data?.orders ?? []).filter((o) => o.status === "ready");

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-8">
      <PageHeader
        title="Waiter"
        description="Mark orders as served when delivered to the table"
      />

      {isLoading && (
        <div className="mt-8 h-32 animate-pulse rounded-2xl bg-muted" />
      )}

      {!isLoading && readyOrders.length === 0 && (
        <EmptyState
          className="mt-8"
          icon={UtensilsCrossed}
          title="No orders ready"
          description="When kitchen marks an order ready, it shows up here."
        />
      )}

      <ul className="mt-6 space-y-3">
        {readyOrders.map((order: OrderWithRelations, i) => (
          <motion.li
            key={order.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">
                  Table {order.table?.label ?? "—"}
                </CardTitle>
                <Badge variant="success">Ready</Badge>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="font-bold">{formatCurrency(order.total)}</span>
                <Button
                  size="sm"
                  onClick={() =>
                    mutation.mutate({ orderId: order.id, status: "served" })
                  }
                  disabled={mutation.isPending}
                >
                  Mark served
                </Button>
              </CardContent>
            </Card>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
