"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Check, Download, Printer } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { QrCode, useQrDownload } from "@/components/ui/qr-code";
import { useAdminTables } from "@/hooks/use-admin";
import { env } from "@/lib/env";
import type { Table } from "@/types/database";

// ─── Print styles (injected at runtime) ──────────────────────────────────────

const PRINT_STYLES = `
@media print {
  body * { visibility: hidden !important; }
  #qr-print-area, #qr-print-area * { visibility: visible !important; }
  #qr-print-area {
    position: fixed !important;
    inset: 0 !important;
    padding: 12mm !important;
    background: #fff !important;
  }
  .qr-card {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .no-print { display: none !important; }
}
`;

// ─── Individual QR card (print-optimised) ─────────────────────────────────────

function getTableUrl(qrCode: string) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : env.appUrl;
  return `${origin}/t/${env.restaurantSlug}/${qrCode}`;
}

function QrCard({ table }: { table: Table }) {
  const url = getTableUrl(table.qr_code);
  const download = useQrDownload(url, "M");

  return (
    <div className="qr-card flex flex-col items-center rounded-2xl border-2 border-dashed border-gray-200 bg-white p-5 gap-3 print:border-solid print:border-gray-300 print:rounded-xl print:shadow-none">
      {/* Restaurant name */}
      <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">
        {env.restaurantSlug}
      </p>

      {/* QR code */}
      <div className="rounded-xl bg-white p-1 ring-1 ring-gray-100">
        <QrCode value={url} size={200} ecc="H" dark="#1a1a1a" />
      </div>

      {/* Table label */}
      <div className="text-center">
        <p className="text-xs text-gray-400 uppercase tracking-widest">Table</p>
        <p className="text-3xl font-black tracking-tight text-gray-900">{table.label}</p>
      </div>

      {/* Instruction */}
      <p className="text-[10px] text-center text-gray-400 leading-relaxed">
        Scan to view menu &amp; order
      </p>

      {/* URL (tiny, for reference) */}
      <p className="text-[9px] font-mono text-gray-300 break-all text-center leading-tight">
        {url}
      </p>

      {/* Download button — hidden in print */}
      <Button
        variant="ghost"
        size="sm"
        className="no-print h-7 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => download(`table-${table.label}-qr.png`)}
      >
        <Download className="mr-1 h-3 w-3" />
        Save PNG
      </Button>
    </div>
  );
}

// ─── Download all as individual PNGs ─────────────────────────────────────────

function DownloadAllButton({ tables }: { tables: Table[] }) {
  const [done, setDone] = useState(false);

  async function downloadAll() {
    const { toCanvas } = await import("qrcode");
    for (const t of tables) {
      const url = getTableUrl(t.qr_code);
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1200;
      await toCanvas(canvas, url, {
        width: 1200,
        margin: 4,
        errorCorrectionLevel: "H",
        color: { dark: "#000000", light: "#ffffff" },
      });
      const link = document.createElement("a");
      link.download = `table-${t.label}-qr.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      // Small delay between downloads to avoid browser blocking
      await new Promise((r) => setTimeout(r, 150));
    }
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  }

  return (
    <Button variant="outline" onClick={downloadAll}>
      {done ? (
        <>
          <Check className="mr-1.5 h-4 w-4 text-green-600" />
          Downloaded!
        </>
      ) : (
        <>
          <Download className="mr-1.5 h-4 w-4" />
          Download all PNGs
        </>
      )}
    </Button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QrPrintPage() {
  const { data: tables = [], isLoading } = useAdminTables();
  const activeTables = tables.filter((t) => t.is_active);
  const printAreaRef = useRef<HTMLDivElement>(null);

  function triggerPrint() {
    // Inject print styles if not already added
    if (!document.getElementById("qr-print-styles")) {
      const style = document.createElement("style");
      style.id = "qr-print-styles";
      style.textContent = PRINT_STYLES;
      document.head.appendChild(style);
    }
    window.print();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toolbar — hidden when printing */}
      <div className="no-print sticky top-0 z-20 flex items-center gap-3 border-b bg-white px-6 py-3 shadow-sm">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/tables">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Link>
        </Button>

        <div className="flex-1" />

        <span className="text-sm text-muted-foreground">
          {activeTables.length} active table{activeTables.length !== 1 ? "s" : ""}
        </span>

        {activeTables.length > 0 && (
          <>
            <DownloadAllButton tables={activeTables} />
            <Button onClick={triggerPrint}>
              <Printer className="mr-1.5 h-4 w-4" />
              Print
            </Button>
          </>
        )}
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 py-8">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-white border" />
            ))}
          </div>
        ) : activeTables.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <p className="text-4xl">🪑</p>
            <p className="font-semibold">No active tables</p>
            <p className="text-sm text-muted-foreground">
              Activate tables in the Tables page to generate QR codes.
            </p>
            <Button asChild variant="outline">
              <Link href="/admin/tables">Manage tables</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* No-print heading */}
            <div className="no-print mb-6">
              <h1 className="text-2xl font-bold">QR Code Sheet</h1>
              <p className="text-sm text-muted-foreground">
                Print this page or download individual PNG files. Each card is sized for A5 / index card printing.
              </p>
            </div>

            {/* Print area */}
            <div
              id="qr-print-area"
              ref={printAreaRef}
              className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            >
              {activeTables.map((table, i) => (
                <motion.div
                  key={table.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <QrCard table={table} />
                </motion.div>
              ))}
            </div>

            {/* Legend */}
            <p className="no-print mt-8 text-center text-xs text-muted-foreground">
              Tip: use landscape orientation and disable headers/footers in your browser&apos;s print dialog for best results.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
