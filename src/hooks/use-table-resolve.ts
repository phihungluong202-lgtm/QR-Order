"use client";

import { useQuery } from "@tanstack/react-query";
import { isSupabaseConfigured } from "@/lib/env";
import { getBrowserServices } from "@/services";

export const tableKeys = {
  resolve: (restaurant: string, qr: string) =>
    ["table", "resolve", restaurant, qr] as const,
};

async function resolveTableApi(restaurant: string, qr: string) {
  const res = await fetch(
    `/api/tables/resolve?restaurant=${encodeURIComponent(restaurant)}&qr=${encodeURIComponent(qr)}`,
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Table not found");
  return data as { tableId: string; restaurantId: string };
}

export function useTableResolve(restaurant: string, qr: string, enabled = true) {
  return useQuery({
    queryKey: tableKeys.resolve(restaurant, qr),
    enabled: enabled && Boolean(restaurant && qr),
    queryFn: async () => {
      if (isSupabaseConfigured()) {
        const services = getBrowserServices();
        if (services) {
          const session = await services.tables.resolveByQr(restaurant, qr);
          if (session) return session;
        }
      }
      return resolveTableApi(restaurant, qr);
    },
    retry: 1,
    staleTime: Infinity,
  });
}
