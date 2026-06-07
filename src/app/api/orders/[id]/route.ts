import { NextRequest, NextResponse } from "next/server";
import { updateDemoOrder } from "@/lib/demo-data";
import { getServerServices } from "@/services";
import type { OrderStatus } from "@/types/database";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { createApiClient } = await import("@/lib/supabase/api");
  const client = createApiClient();

  if (client) {
    try {
      const { data, error } = await client
        .from("orders")
        .select("id, status, total, created_at, table_id")
        .eq("id", id)
        .is("deleted_at", null)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      return NextResponse.json({ order: data });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Fetch failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { items } = body as { items: { menuItemId: string; quantity: number; notes?: string }[] };

  if (!items?.length) {
    return NextResponse.json({ error: "Items required" }, { status: 400 });
  }

  const services = getServerServices();
  if (!services) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const order = await services.orders.addItems(id, items);
    return NextResponse.json({ order });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to add items";
    console.error("[POST /api/orders/:id/items]", message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { status } = body as { status: OrderStatus };

  if (!status) {
    return NextResponse.json({ error: "Status required" }, { status: 400 });
  }

  const services = getServerServices();

  if (services) {
    try {
      const order = await services.orders.updateStatus(id, status);
      return NextResponse.json({ order });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Update failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const order = updateDemoOrder(id, { status });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}
