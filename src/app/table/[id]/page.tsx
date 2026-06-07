"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Utensils } from "lucide-react";
import { MenuExperience } from "@/components/menu/menu-experience";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { useCartStore } from "@/stores/cart-store";
import { createClientIfConfigured } from "@/lib/supabase/client";
import type { TrackedOrder } from "@/stores/cart-store";
import type { OrderStatus } from "@/types/database";
import Link from "next/link";

interface TableSession {
  tableId: string;
  restaurantId: string;
  label?: string;
  restaurantSlug?: string;
}

function TableMenuPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tableId = params.id as string;
  const restaurantSlug = searchParams.get("restaurant") ?? env.restaurantSlug;

  const setSession = useCartStore((s) => s.setSession);
  const syncServerOrders = useCartStore((s) => s.syncServerOrders);
  const [session, setTableSession] = useState<TableSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/tables/${encodeURIComponent(tableId)}?restaurant=${encodeURIComponent(restaurantSlug)}`,
        );
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(data.error ?? "Table not found");
          return;
        }
        if (!cancelled && data.tableId && data.restaurantId) {
          setSession(data.tableId, data.restaurantId);
          setTableSession({
            tableId: data.tableId,
            restaurantId: data.restaurantId,
            label: data.label,
            restaurantSlug: data.restaurantSlug ?? restaurantSlug,
          });

          // ── Restore orders from server after reopen ────────────────────
          // Fetch active orders for this table directly from Supabase.
          // This ensures the customer sees their orders even after closing the browser.
          const supabase = createClientIfConfigured();
          if (supabase && !cancelled) {
            // Only restore orders that are still active — exclude terminal states
            // (paid/served) so a new customer scanning the table starts fresh
            const { data: serverOrders } = await supabase
              .from("orders")
              .select("id, status, total, created_at")
              .eq("table_id", data.tableId)
              .not("status", "in", '("cancelled","paid","served")')
              .is("deleted_at", null)
              .order("created_at", { ascending: false })
              .limit(10);

            if (serverOrders && serverOrders.length > 0 && !cancelled) {
              const tracked: TrackedOrder[] = serverOrders.map((o) => ({
                id: o.id,
                status: o.status as OrderStatus,
                tableId: data.tableId as string,
                total: o.total ?? undefined,
                createdAt: o.created_at,
              }));
              syncServerOrders(tracked);
            }
          }
        }
      } catch {
        if (!cancelled) setError("Could not load table");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tableId, restaurantSlug, setSession, syncServerOrders]);

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Loader2 className="h-10 w-10 text-primary" />
        </motion.div>
        <p className="text-center text-muted-foreground">Opening your menu…</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 safe-top">
        <EmptyState
          icon={Utensils}
          title="Table not found"
          description={error ?? "Scan the QR code at your table to order."}
          action={
            <Button asChild variant="outline">
              <Link href="/menu">Browse demo menu</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <MenuExperience
      restaurantSlug={session.restaurantSlug ?? restaurantSlug}
      tableLabel={session.label}
      restaurantName="Demo Bistro"
    />
  );
}

export default function TableMenuPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <TableMenuPageContent />
    </Suspense>
  );
}
