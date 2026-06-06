"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";

export default function TableEntryPage() {
  const params = useParams();
  const router = useRouter();
  const setSession = useCartStore((s) => s.setSession);

  const restaurantSlug = params.restaurant as string;
  const tableQr = params.table as string;

  useEffect(() => {
    async function resolveTable() {
      try {
        const res = await fetch(
          `/api/tables/resolve?restaurant=${encodeURIComponent(restaurantSlug)}&qr=${encodeURIComponent(tableQr)}`,
        );
        const data = await res.json();
        if (data.tableId && data.restaurantId) {
          setSession(data.tableId, data.restaurantId);
          router.replace(
            `/table/${encodeURIComponent(data.tableId)}?restaurant=${encodeURIComponent(restaurantSlug)}`,
          );
          return;
        }
      } catch {
        setSession(`table-${tableQr}`, `restaurant-${restaurantSlug}`);
      }
      router.replace(
        `/table/${encodeURIComponent(tableQr)}?restaurant=${encodeURIComponent(restaurantSlug)}`,
      );
    }
    resolveTable();
  }, [restaurantSlug, tableQr, setSession, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      >
        <Loader2 className="h-10 w-10 text-primary" />
      </motion.div>
      <p className="text-center text-muted-foreground">
        Loading your table menu…
      </p>
    </div>
  );
}
