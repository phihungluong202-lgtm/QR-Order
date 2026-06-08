import { assertNoError } from "@/lib/database/errors";
import type { TypedSupabaseClient } from "@/lib/database/helpers";
import type {
  Order,
  OrderStatus,
  OrderWithRelations,
} from "@/types/database";

export interface CreateOrderLineInput {
  menuItemId: string;
  quantity: number;
  notes?: string;
}

export interface CreateOrderInput {
  restaurantId: string;
  tableId: string;
  notes?: string;
  items: CreateOrderLineInput[];
}

export class OrdersService {
  constructor(private readonly client: TypedSupabaseClient) {}

  async listForRestaurant(
    restaurantId: string,
    options?: { kitchenView?: boolean; limit?: number },
  ): Promise<OrderWithRelations[]> {
    let query = this.client
      .from("orders")
      .select(
        "*, table:tables(label), order_items(*, menu_item:menu_items(name))",
      )
      .eq("restaurant_id", restaurantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(options?.limit ?? 50);

    if (options?.kitchenView) {
      query = query.not("status", "in", '("served","cancelled")');
    }

    const { data, error } = await query;
    assertNoError(error);
    return (data ?? []) as OrderWithRelations[];
  }

  async create(input: CreateOrderInput): Promise<Order> {
    const lineTotals = await Promise.all(
      input.items.map(async (line) => {
        const { data: item, error } = await this.client
          .from("menu_items")
          .select("price")
          .eq("id", line.menuItemId)
          .single();
        assertNoError(error);
        return (item?.price ?? 0) * line.quantity;
      }),
    );

    const total = lineTotals.reduce((sum, n) => sum + n, 0);

    const { data: order, error: orderError } = await this.client
      .from("orders")
      .insert({
        restaurant_id: input.restaurantId,
        table_id: input.tableId,
        status: "pending",
        notes: input.notes ?? null,
        total,
      })
      .select()
      .single();

    assertNoError(orderError);
    if (!order) throw new Error("Failed to create order");

    const orderItems = await Promise.all(
      input.items.map(async (line) => {
        const { data: item, error } = await this.client
          .from("menu_items")
          .select("price")
          .eq("id", line.menuItemId)
          .single();
        assertNoError(error);
        return {
          order_id: order.id,
          menu_item_id: line.menuItemId,
          quantity: line.quantity,
          unit_price: item?.price ?? 0,
          notes: line.notes ?? null,
        };
      }),
    );

    const { error: itemsError } = await this.client
      .from("order_items")
      .insert(orderItems);

    assertNoError(itemsError);
    return order;
  }

  async addItems(orderId: string, items: CreateOrderLineInput[]): Promise<Order> {
    // Fetch current order
    const { data: order, error: orderError } = await this.client
      .from("orders")
      .select("id, total, status")
      .eq("id", orderId)
      .is("deleted_at", null)
      .single();
    assertNoError(orderError);
    if (!order) throw new Error("Order not found");

    // Resolve unit prices for each item
    const resolvedItems: {
      order_id: string;
      menu_item_id: string;
      quantity: number;
      unit_price: number;
      notes: string | null;
      lineTotal: number;
    }[] = [];

    for (const line of items) {
      const { data: menuItem, error } = await this.client
        .from("menu_items")
        .select("price")
        .eq("id", line.menuItemId)
        .single();
      assertNoError(error);
      const price = menuItem?.price ?? 0;
      resolvedItems.push({
        order_id: orderId,
        menu_item_id: line.menuItemId,
        quantity: line.quantity,
        unit_price: price,
        notes: line.notes ?? null,
        lineTotal: price * line.quantity,
      });
    }

    // Insert new order_items (strip lineTotal helper field)
    const { error: insertError } = await this.client
      .from("order_items")
      .insert(
        resolvedItems.map(({ lineTotal: _ignored, ...row }) => row),
      );
    assertNoError(insertError);

    // Update order total
    const addedTotal = resolvedItems.reduce((s, i) => s + i.lineTotal, 0);
    const { data: updated, error: updateError } = await this.client
      .from("orders")
      .update({ total: (order.total ?? 0) + addedTotal })
      .eq("id", orderId)
      .select()
      .single();
    assertNoError(updateError);
    if (!updated) throw new Error("Failed to update order total");
    return updated;
  }

  async updateStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const { data, error } = await this.client
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .select()
      .single();

    assertNoError(error);
    if (!data) throw new Error("Order not found");
    return data;
  }

  /** Mark all non-cancelled orders for a table as paid */
  async payTable(tableId: string): Promise<{ count: number; total: number }> {
    const { data: orders, error: fetchError } = await this.client
      .from("orders")
      .select("id, total, status")
      .eq("table_id", tableId)
      .not("status", "in", '("cancelled","paid")')
      .is("deleted_at", null);

    assertNoError(fetchError);
    if (!orders || orders.length === 0) return { count: 0, total: 0 };

    const now = new Date().toISOString();
    const ids = orders.map((o) => o.id);
    const total = orders.reduce((s, o) => s + (o.total ?? 0), 0);

    const { error: updateError } = await this.client
      .from("orders")
      .update({ status: "paid", paid_at: now, updated_at: now })
      .in("id", ids);

    assertNoError(updateError);
    return { count: ids.length, total };
  }

  /** Cancel all non-terminal orders for a table (admin "close table") */
  async closeTable(tableId: string): Promise<{ count: number }> {
    const { data: orders, error: fetchError } = await this.client
      .from("orders")
      .select("id, status")
      .eq("table_id", tableId)
      .not("status", "in", '("cancelled","paid")')
      .is("deleted_at", null);

    assertNoError(fetchError);
    if (!orders || orders.length === 0) return { count: 0 };

    const now = new Date().toISOString();
    const ids = orders.map((o) => o.id);

    const { error: updateError } = await this.client
      .from("orders")
      .update({ status: "cancelled", updated_at: now })
      .in("id", ids);

    assertNoError(updateError);
    return { count: ids.length };
  }
}
