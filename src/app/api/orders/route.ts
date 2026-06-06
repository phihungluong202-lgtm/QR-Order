import { NextRequest, NextResponse } from "next/server";
import {
  addDemoOrder,
  demoMenuItems,
  demoTables,
  getDemoOrders,
  DEMO_RESTAURANT_ID,
} from "@/lib/demo-data";
import { getServerServices } from "@/services";
import type { OrderItem, OrderWithRelations } from "@/types/database";

export async function GET(request: NextRequest) {
  const restaurantId =
    request.nextUrl.searchParams.get("restaurantId") ?? DEMO_RESTAURANT_ID;
  const view = request.nextUrl.searchParams.get("view");
  const services = getServerServices();

  if (services) {
    try {
      const orders = await services.orders.listForRestaurant(restaurantId, {
        kitchenView: view === "kitchen",
      });
      return NextResponse.json({ orders });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to fetch orders";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const orders = getDemoOrders(restaurantId).map((o) => ({
    ...o,
    table: demoTables.find((t) => t.id === o.table_id),
  }));

  return NextResponse.json({ orders });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { tableId, restaurantId, notes, items } = body as {
    tableId: string;
    restaurantId: string;
    notes?: string;
    items: { menuItemId: string; quantity: number; notes?: string }[];
  };

  if (!tableId || !restaurantId || !items?.length) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const services = getServerServices();

  if (services) {
    try {
      const order = await services.orders.create({
        restaurantId,
        tableId,
        notes,
        items: items.map((line) => ({
          menuItemId: line.menuItemId,
          quantity: line.quantity,
          notes: line.notes,
        })),
      });
      return NextResponse.json({ order });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create order";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const menuLookup = new Map(demoMenuItems.map((m) => [m.id, m]));
  let total = 0;
  const orderId = `order-${Date.now()}`;
  const now = new Date().toISOString();
  const orderItems: OrderItem[] = items.map((line, i) => {
    const menuItem = menuLookup.get(line.menuItemId);
    const unitPrice = menuItem?.price ?? 0;
    total += unitPrice * line.quantity;
    return {
      id: `oi-${Date.now()}-${i}`,
      order_id: orderId,
      menu_item_id: line.menuItemId,
      quantity: line.quantity,
      unit_price: unitPrice,
      notes: line.notes ?? null,
      created_at: now,
    };
  });

  const order: OrderWithRelations = {
    id: orderId,
    restaurant_id: restaurantId,
    table_id: tableId,
    status: "pending",
    notes: notes ?? null,
    total,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    table: demoTables.find((t) => t.id === tableId),
    order_items: orderItems.map((oi) => ({
      ...oi,
      menu_item: menuLookup.get(oi.menu_item_id)
        ? { name: menuLookup.get(oi.menu_item_id)!.name }
        : null,
    })),
  };

  addDemoOrder(order);

  return NextResponse.json({ order });
}
