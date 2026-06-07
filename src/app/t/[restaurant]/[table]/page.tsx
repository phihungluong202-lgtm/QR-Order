"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, ScanLine } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TableEntryPage() {
  const params = useParams();
  const router = useRouter();
  const setSession = useCartStore((s) => s.setSession);

  const restaurantSlug = params.restaurant as string;
  const tableQr = params.table as string;

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function resolveTable() {
      try {
        const res = await fetch(
          `/api/tables/resolve?restaurant=${encodeURIComponent(restaurantSlug)}&qr=${encodeURIComponent(tableQr)}`,
        );
        const data = await res.json();

        if (res.ok && data.tableId && data.restaurantId) {
          setSession(data.tableId, data.restaurantId);
          router.replace(
            `/table/${encodeURIComponent(data.tableId)}?restaurant=${encodeURIComponent(restaurantSlug)}`,
          );
          return;
        }

        // Table not found in database
        setError(data.error ?? "Table not found. Please scan the QR code again.");
      } catch {
        setError("Could not connect to server. Please check your connection.");
      }
    }
    resolveTable();
  }, [restaurantSlug, tableQr, setSession, router]);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ScanLine className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Table not found</h1>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
              {error}
            </p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href="/menu">Browse demo menu</Link>
        </Button>
      </div>
    );
  }

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
