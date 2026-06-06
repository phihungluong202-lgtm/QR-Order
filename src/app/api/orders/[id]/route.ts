import { NextRequest, NextResponse } from "next/server";
import { updateDemoOrder } from "@/lib/demo-data";
import { getServerServices } from "@/services";
import type { OrderStatus } from "@/types/database";

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
