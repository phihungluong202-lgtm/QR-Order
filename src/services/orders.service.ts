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
}
