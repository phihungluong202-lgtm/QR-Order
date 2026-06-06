"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  QrCode,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const adminLinks = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/admin/tables", label: "Tables & QR", icon: QrCode },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
] as const;

const staffLinks = [
  { href: "/kitchen", label: "Kitchen", icon: ChefHat },
  { href: "/waiter", label: "Waiter", icon: UtensilsCrossed },
] as const;

interface DashboardSidebarProps {
  variant: "admin" | "staff";
}

export function DashboardSidebar({ variant }: DashboardSidebarProps) {
  const pathname = usePathname();
  const links = variant === "admin" ? adminLinks : staffLinks;

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
        <div className="gradient-brand p-6 text-brand-foreground">
          <p className="text-xs font-medium uppercase tracking-wider opacity-90">
            QR Order
          </p>
          <p className="mt-1 text-lg font-bold">
            {variant === "admin" ? "Admin" : "Staff"}
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-4">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId={`sidebar-${variant}`}
                    className="absolute inset-0 rounded-xl bg-primary/10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon className="relative h-4 w-4" />
                <span className="relative">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4">
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/">
              <LogOut className="h-4 w-4" />
              Exit
            </Link>
          </Button>
        </div>
      </aside>

      <nav className="glass safe-bottom fixed bottom-0 left-0 right-0 z-50 flex border-t md:hidden">
        <div className="flex w-full justify-around py-2">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
