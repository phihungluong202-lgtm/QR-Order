import { CustomerShell } from "@/components/layout/customer-shell";

export default function TableLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomerShell>{children}</CustomerShell>;
}
