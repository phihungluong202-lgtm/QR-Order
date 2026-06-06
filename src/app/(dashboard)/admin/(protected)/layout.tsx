import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { isSupabaseConfigured } from "@/lib/env";
import { requireStaff } from "@/lib/supabase/auth";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isSupabaseConfigured()) {
    const auth = await requireStaff(["admin", "kitchen", "waiter"]);
    if (!auth) {
      redirect("/admin/login");
    }
  }

  return (
    <div className="flex min-h-dvh">
      <DashboardSidebar variant="admin" />
      <main className="flex-1 overflow-auto pb-20 md:pb-0">{children}</main>
    </div>
  );
}
