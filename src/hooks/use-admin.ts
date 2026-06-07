"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import { updateOrderStatus } from "@/api/orders";
import { DEMO_RESTAURANT_ID } from "@/lib/constants";
import type { AdminStats } from "@/lib/demo-data";
import type { Category, MenuItem, Table, OrderStatus, OrderWithRelations } from "@/types/database";

const R = DEMO_RESTAURANT_ID;

// ─── Query keys ──────────────────────────────────────────────────────────────

export const adminKeys = {
  stats: (rid: string) => ["admin", "stats", rid] as const,
  categories: (rid: string) => ["admin", "categories", rid] as const,
  items: (rid: string) => ["admin", "items", rid] as const,
  tables: (rid: string) => ["admin", "tables", rid] as const,
  orders: (rid: string) => ["admin", "orders", rid] as const,
};

// ─── Stats ────────────────────────────────────────────────────────────────────

export function useAdminStats(restaurantId = R) {
  return useQuery({
    queryKey: adminKeys.stats(restaurantId),
    queryFn: () =>
      apiFetch<AdminStats>(
        `/api/admin/stats?restaurantId=${encodeURIComponent(restaurantId)}`,
      ),
    refetchInterval: 60_000,
  });
}

// ─── Categories ──────────────────────────────────────────────────────────────

export function useAdminCategories(restaurantId = R) {
  return useQuery({
    queryKey: adminKeys.categories(restaurantId),
    queryFn: () =>
      apiFetch<{ categories: Category[] }>(
        `/api/admin/menu/categories?restaurantId=${encodeURIComponent(restaurantId)}`,
      ).then((r) => r.categories),
  });
}

export function useCreateCategory(restaurantId = R) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<{ category: Category }>("/api/admin/menu/categories", {
        method: "POST",
        body: JSON.stringify({ restaurantId, name }),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: adminKeys.categories(restaurantId) }),
  });
}

export function useUpdateCategory(restaurantId = R) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: { id: string; name?: string; isActive?: boolean; sortOrder?: number }) =>
      apiFetch<{ category: Category }>(`/api/admin/menu/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: adminKeys.categories(restaurantId) }),
  });
}

export function useDeleteCategory(restaurantId = R) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/menu/categories/${id}`, { method: "DELETE" }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: adminKeys.categories(restaurantId) }),
  });
}

// ─── Menu items ───────────────────────────────────────────────────────────────

export function useAdminMenuItems(restaurantId = R) {
  return useQuery({
    queryKey: adminKeys.items(restaurantId),
    queryFn: () =>
      apiFetch<{ items: MenuItem[] }>(
        `/api/admin/menu/items?restaurantId=${encodeURIComponent(restaurantId)}`,
      ).then((r) => r.items),
  });
}

export interface CreateItemInput {
  restaurantId?: string;
  categoryId: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable?: boolean;
}

export function useCreateMenuItem(restaurantId = R) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateItemInput) =>
      apiFetch<{ item: MenuItem }>("/api/admin/menu/items", {
        method: "POST",
        body: JSON.stringify({ restaurantId, ...input }),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: adminKeys.items(restaurantId) }),
  });
}

export interface UpdateItemInput {
  id: string;
  categoryId?: string;
  name?: string;
  description?: string | null;
  price?: number;
  imageUrl?: string | null;
  isAvailable?: boolean;
}

export function useUpdateMenuItem(restaurantId = R) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: UpdateItemInput) =>
      apiFetch<{ item: MenuItem }>(`/api/admin/menu/items/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: adminKeys.items(restaurantId) }),
  });
}

export function useDeleteMenuItem(restaurantId = R) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/menu/items/${id}`, { method: "DELETE" }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: adminKeys.items(restaurantId) }),
  });
}

/** Upload image to Supabase Storage. Returns the public URL. */
export function useUploadImage() {
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url)
        throw new Error(data.error ?? "Upload failed");
      return data.url;
    },
  });
}

// ─── Tables ───────────────────────────────────────────────────────────────────

export function useAdminTables(restaurantId = R) {
  return useQuery({
    queryKey: adminKeys.tables(restaurantId),
    queryFn: () =>
      apiFetch<{ tables: Table[] }>(
        `/api/admin/tables?restaurantId=${encodeURIComponent(restaurantId)}`,
      ).then((r) => r.tables),
  });
}

export function useCreateTable(restaurantId = R) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (label: string) =>
      apiFetch<{ table: Table }>("/api/admin/tables", {
        method: "POST",
        body: JSON.stringify({ restaurantId, label }),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: adminKeys.tables(restaurantId) }),
  });
}

export function useUpdateTable(restaurantId = R) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: { id: string; label?: string; isActive?: boolean }) =>
      apiFetch<{ table: Table }>(`/api/admin/tables/${id}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: adminKeys.tables(restaurantId) }),
  });
}

export function useDeleteTable(restaurantId = R) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/tables/${id}`, { method: "DELETE" }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: adminKeys.tables(restaurantId) }),
  });
}

// ─── Orders (admin view) ─────────────────────────────────────────────────────

export function useAdminOrders(restaurantId = R) {
  return useQuery({
    queryKey: adminKeys.orders(restaurantId),
    queryFn: () =>
      apiFetch<{ orders: OrderWithRelations[] }>(
        `/api/orders?restaurantId=${encodeURIComponent(restaurantId)}`,
      ).then((r) => r.orders),
    refetchInterval: 15_000,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      updateOrderStatus(orderId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.orders(R) });
      qc.invalidateQueries({ queryKey: adminKeys.stats(R) });
    },
  });
}

export function usePayTable(restaurantId = R) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tableId: string) =>
      apiFetch<{ success: boolean; count: number; total: number }>(
        "/api/orders/pay-table",
        { method: "POST", body: JSON.stringify({ tableId }) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.orders(restaurantId) });
      qc.invalidateQueries({ queryKey: adminKeys.stats(restaurantId) });
    },
  });
}
