"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Download,
  Edit2,
  ExternalLink,
  Loader2,
  Plus,
  Printer,
  QrCode as QrIcon,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { QrCode, useQrDownload } from "@/components/ui/qr-code";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { env } from "@/lib/env";
import {
  useAdminTables,
  useCreateTable,
  useUpdateTable,
  useDeleteTable,
} from "@/hooks/use-admin";
import type { Table } from "@/types/database";

// ─── QR download button ───────────────────────────────────────────────────────

function QrDownloadButton({ url, filename }: { url: string; filename: string }) {
  const download = useQrDownload(url, "M");
  return (
    <Button variant="outline" className="flex-1" onClick={() => download(filename)}>
      <Download className="mr-1.5 h-4 w-4" />
      Download PNG
    </Button>
  );
}

// ─── QR modal ────────────────────────────────────────────────────────────────

// Always use the live origin so QR codes work regardless of NEXT_PUBLIC_APP_URL
function getTableUrl(qrCode: string) {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : env.appUrl;
  return `${origin}/t/${env.restaurantSlug}/${qrCode}`;
}

function QrModal({ table, onClose }: { table: Table; onClose: () => void }) {
  const url = getTableUrl(table.qr_code);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl text-center"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-lg">Table {table.label}</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* QR code (local, no external service) */}
        <div className="mx-auto mb-4 flex items-center justify-center rounded-xl border bg-white p-4">
          <QrCode value={url} size={260} ecc="H" />
        </div>

        {/* URL chip */}
        <p className="mb-4 break-all rounded-lg bg-muted px-3 py-2 text-xs font-mono text-muted-foreground">
          {url}
        </p>

        <div className="flex gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Open
            </Link>
          </Button>
          <QrDownloadButton url={url} filename={`table-${table.label}-qr.png`} />
        </div>
      </motion.div>
    </div>
  );
}

// ─── Table form ───────────────────────────────────────────────────────────────

function TableFormModal({
  initial,
  onSubmit,
  onClose,
  isPending,
}: {
  initial?: Table;
  onSubmit: (label: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) { setError("Label is required"); return; }
    onSubmit(label.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">{initial ? "Edit table" : "Add table"}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="table-label">Label *</Label>
            <Input
              id="table-label"
              value={label}
              onChange={(e) => { setLabel(e.target.value); setError(""); }}
              placeholder="e.g. A1, VIP 1, Terrace 3"
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Confirm delete ───────────────────────────────────────────────────────────

function ConfirmDelete({
  label,
  onConfirm,
  onCancel,
  isPending,
}: {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl"
      >
        <h3 className="font-bold">Remove Table &ldquo;{label}&rdquo;?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The QR link for this table will stop working.
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Table card ───────────────────────────────────────────────────────────────

function TableCard({
  table,
  onQr,
  onEdit,
  onDelete,
  onToggle,
}: {
  table: Table;
  onQr: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const url = getTableUrl(table.qr_code);

  return (
    <Card className={cn("overflow-hidden transition-opacity", !table.is_active && "opacity-60")}>
      {/* QR thumbnail — click to open modal */}
      <button
        className="flex w-full items-center justify-center bg-white p-4 hover:bg-gray-50 transition-colors"
        onClick={onQr}
        title="View QR code"
      >
        <QrCode value={url} size={88} ecc="M" />
      </button>

      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Table</p>
            <p className="text-xl font-black">{table.label}</p>
          </div>
          <Badge variant={table.is_active ? "success" : "secondary"}>
            {table.is_active ? "Active" : "Hidden"}
          </Badge>
        </div>

        <p className="mt-1 truncate text-xs font-mono text-muted-foreground">
          /t/{env.restaurantSlug}/{table.qr_code}
        </p>

        {/* Actions */}
        <div className="mt-3 grid grid-cols-3 gap-1">
          <Button variant="outline" size="sm" className="text-xs" onClick={onQr} title="View QR">
            <QrIcon className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={onEdit} title="Edit">
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        <button
          className="mt-2 w-full rounded-lg border py-1 text-xs font-medium transition-colors hover:bg-muted"
          onClick={onToggle}
        >
          {table.is_active ? "Hide table" : "Activate table"}
        </button>
      </div>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminTablesPage() {
  const { toast } = useToast();
  const { data: tables = [], isLoading } = useAdminTables();
  const createTable = useCreateTable();
  const updateTable = useUpdateTable();
  const deleteTable = useDeleteTable();

  const [showForm, setShowForm] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [deletingTable, setDeletingTable] = useState<Table | null>(null);
  const [qrTable, setQrTable] = useState<Table | null>(null);

  function handleSubmit(label: string) {
    if (editingTable) {
      updateTable.mutate(
        { id: editingTable.id, label },
        {
          onSuccess: () => { setEditingTable(null); toast({ title: "Table updated" }); },
          onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
        },
      );
    } else {
      createTable.mutate(label, {
        onSuccess: () => { setShowForm(false); toast({ title: "Table added" }); },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  }

  function handleToggleActive(table: Table) {
    updateTable.mutate(
      { id: table.id, isActive: !table.is_active },
      {
        onSuccess: () => toast({ title: table.is_active ? "Table hidden" : "Table activated" }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      },
    );
  }

  function confirmDelete() {
    if (!deletingTable) return;
    deleteTable.mutate(deletingTable.id, {
      onSuccess: () => { setDeletingTable(null); toast({ title: "Table removed" }); },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Tables & QR codes"
        description="Each table gets a unique QR link. Customers scan to order."
        action={
          <div className="flex gap-2">
            {tables.length > 0 && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/tables/print">
                  <Printer className="mr-1.5 h-4 w-4" />
                  Print all QR
                </Link>
              </Button>
            )}
            <Button size="sm" onClick={() => { setEditingTable(null); setShowForm(true); }}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add table
            </Button>
          </div>
        }
      />

      {/* Summary */}
      {tables.length > 0 && (
        <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
          <span>
            <span className="font-bold text-foreground">{tables.filter((t) => t.is_active).length}</span> active
          </span>
          <span>
            <span className="font-bold text-foreground">{tables.length}</span> total
          </span>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={QrIcon}
          title="No tables yet"
          description="Add a table to generate a QR code customers can scan."
          action={
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add first table
            </Button>
          }
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence>
            {tables.map((table) => (
              <motion.div
                key={table.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <TableCard
                  table={table}
                  onQr={() => setQrTable(table)}
                  onEdit={() => { setEditingTable(table); setShowForm(true); }}
                  onDelete={() => setDeletingTable(table)}
                  onToggle={() => handleToggleActive(table)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      {(showForm || editingTable) && (
        <TableFormModal
          initial={editingTable ?? undefined}
          onSubmit={handleSubmit}
          onClose={() => { setShowForm(false); setEditingTable(null); }}
          isPending={createTable.isPending || updateTable.isPending}
        />
      )}

      {deletingTable && (
        <ConfirmDelete
          label={deletingTable.label}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingTable(null)}
          isPending={deleteTable.isPending}
        />
      )}

      {qrTable && <QrModal table={qrTable} onClose={() => setQrTable(null)} />}
    </div>
  );
}
