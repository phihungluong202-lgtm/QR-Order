"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ClipboardList,
  DollarSign,
  QrCode,
  RefreshCw,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useAdminStats, useAdminOrders } from "@/hooks/use-admin";
import type { OrderWithRelations } from "@/types/database";

const STATUS_COLOR: Record<string, string> = {
  pending: "text-amber-600",
  confirmed: "text-blue-500",
  preparing: "text-blue-600",
  ready: "text-emerald-600",
  served: "text-muted-foreground",
  cancelled: "text-destructive",
};

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading, refetch } = useAdminStats();
  const { data: orders, isLoading: ordersLoading } = useAdminOrders();

  const recentOrders = (orders ?? []).slice(0, 5);

  const statCards = [
    {
      label: "Active tables",
      value: statsLoading ? "…" : String(stats?.activeTableCount ?? 0),
      icon: QrCode,
      href: "/admin/tables",
      color: "text-violet-600",
    },
    {
      label: "Menu items",
      value: statsLoading ? "…" : String(stats?.menuItemCount ?? 0),
      icon: UtensilsCrossed,
      href: "/admin/menu",
      color: "text-orange-600",
    },
    {
      label: "Orders today",
      value: statsLoading ? "…" : String(stats?.ordersToday ?? 0),
      icon: ShoppingBag,
      href: "/admin/orders",
      color: "text-blue-600",
    },
    {
      label: "Revenue today",
      value: statsLoading ? "…" : formatCurrency(stats?.revenueToday ?? 0),
      icon: DollarSign,
      href: "/admin/orders",
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Admin dashboard"
        description="Manage your restaurant, menu, and table QR codes"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      {/* Stats grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <Link href={card.href}>
              <Card className="group transition-shadow hover:shadow-md">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <CardDescription className="text-xs font-medium uppercase tracking-wide">
                    {card.label}
                  </CardDescription>
                  <card.icon
                    className={`h-4 w-4 ${card.color} opacity-80 group-hover:opacity-100`}
                  />
                </CardHeader>
                <div className="px-6 pb-4">
                  <p className="text-2xl font-black tabular-nums">{card.value}</p>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick links */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          {
            href: "/admin/menu",
            icon: UtensilsCrossed,
            title: "Menu management",
            desc: "Categories, items, pricing, and availability",
          },
          {
            href: "/admin/tables",
            icon: QrCode,
            title: "Tables & QR",
            desc: "Add tables and generate printable QR codes",
          },
          {
            href: "/admin/orders",
            icon: ClipboardList,
            title: "Orders",
            desc: "Full order history and revenue breakdown",
          },
        ].map((link, i) => (
          <motion.div
            key={link.href}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.07 }}
          >
            <Link href={link.href}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <link.icon className="mb-2 h-7 w-7 text-primary" />
                  <CardTitle className="text-base">{link.title}</CardTitle>
                  <CardDescription>{link.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Recent orders */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Recent orders
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/orders">View all →</Link>
          </Button>
        </div>

        <Card>
          {ordersLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              No orders yet today.
            </div>
          ) : (
            <ul className="divide-y">
              {recentOrders.map((order: OrderWithRelations) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between px-5 py-3 text-sm"
                >
                  <span className="font-medium">
                    Table {order.table?.label ?? "—"}
                  </span>
                  <span
                    className={`capitalize font-semibold ${STATUS_COLOR[order.status] ?? ""}`}
                  >
                    {order.status}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {new Date(order.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="font-bold tabular-nums">
                    {formatCurrency(order.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
