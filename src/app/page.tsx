"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChefHat,
  LayoutDashboard,
  QrCode,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const portals = [
  {
    href: "/t/demo/table-1",
    title: "Customer",
    description: "Scan QR → browse menu → order",
    icon: QrCode,
    accent: "from-orange-500/20 to-rose-500/20",
  },
  {
    href: "/kitchen",
    title: "Kitchen",
    description: "Live order queue for the line",
    icon: ChefHat,
    accent: "from-amber-500/20 to-orange-500/20",
  },
  {
    href: "/waiter",
    title: "Waiter",
    description: "Update order status at tables",
    icon: UtensilsCrossed,
    accent: "from-emerald-500/20 to-teal-500/20",
  },
  {
    href: "/admin",
    title: "Admin",
    description: "Menu, tables, and restaurant setup",
    icon: LayoutDashboard,
    accent: "from-violet-500/20 to-indigo-500/20",
  },
] as const;

export default function HomePage() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-background to-background" />

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 py-10 safe-top safe-bottom">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-brand shadow-lg shadow-primary/30">
            <Sparkles className="h-7 w-7 text-brand-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">QR Order</h1>
          <p className="mt-2 text-muted-foreground">
            Food delivery–style ordering for dine-in. Scan, tap, enjoy.
          </p>
        </motion.div>

        <div className="grid flex-1 gap-4">
          {portals.map((portal, i) => (
            <motion.div
              key={portal.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
            >
              <Link href={portal.href}>
                <Card className="group overflow-hidden transition-shadow hover:shadow-md">
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${portal.accent} opacity-0 transition-opacity group-hover:opacity-100`}
                  />
                  <CardHeader className="relative flex-row items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                      <portal.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <CardTitle>{portal.title}</CardTitle>
                      <CardDescription>{portal.description}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center text-xs text-muted-foreground"
        >
          Demo table link:{" "}
          <Button variant="link" className="h-auto p-0 text-xs" asChild>
            <Link href="/t/demo/table-1">/t/demo/table-1</Link>
          </Button>
        </motion.p>
      </div>
    </main>
  );
}
