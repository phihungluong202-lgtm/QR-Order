import { assertNoError } from "@/lib/database/errors";
import type { TypedSupabaseClient } from "@/lib/database/helpers";
import type { Category, MenuItem, Table } from "@/types/database";

export interface AdminStats {
  activeTableCount: number;
  menuItemCount: number;
  ordersToday: number;
  revenueToday: number;
}

export interface CreateCategoryInput {
  restaurantId: string;
  name: string;
  sortOrder?: number;
}
export interface UpdateCategoryInput {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateMenuItemInput {
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable?: boolean;
  sortOrder?: number;
}
export interface UpdateMenuItemInput {
  categoryId?: string;
  name?: string;
  description?: string | null;
  price?: number;
  imageUrl?: string | null;
  isAvailable?: boolean;
  sortOrder?: number;
}

export interface CreateTableInput {
  restaurantId: string;
  label: string;
}
export interface UpdateTableInput {
  label?: string;
  isActive?: boolean;
}

export class AdminService {
  constructor(private readonly client: TypedSupabaseClient) {}

  // ─── Stats ───────────────────────────────────────────────────────────────────

  async getStats(restaurantId: string): Promise<AdminStats> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [tRes, iRes, oRes] = await Promise.all([
      this.client
        .from("tables")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .is("deleted_at", null),
      this.client
        .from("menu_items")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .eq("is_available", true)
        .is("deleted_at", null),
      this.client
        .from("orders")
        .select("total")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", todayStart.toISOString())
        .is("deleted_at", null),
    ]);

    const orders = oRes.data ?? [];
    return {
      activeTableCount: tRes.count ?? 0,
      menuItemCount: iRes.count ?? 0,
      ordersToday: orders.length,
      revenueToday: orders.reduce((s, o) => s + (o.total ?? 0), 0),
    };
  }

  // ─── Categories ─────────────────────────────────────────────────────────────

  async listCategories(restaurantId: string): Promise<Category[]> {
    const { data, error } = await this.client
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .is("deleted_at", null)
      .order("sort_order");
    assertNoError(error);
    return data ?? [];
  }

  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const { data, error } = await this.client
      .from("categories")
      .insert({
        restaurant_id: input.restaurantId,
        name: input.name,
        sort_order: input.sortOrder ?? 0,
        is_active: true,
      })
      .select()
      .single();
    assertNoError(error);
    if (!data) throw new Error("Failed to create category");
    return data;
  }

  async updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) patch.name = input.name;
    if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
    if (input.isActive !== undefined) patch.is_active = input.isActive;

    const { data, error } = await this.client
      .from("categories")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    assertNoError(error);
    if (!data) throw new Error("Category not found");
    return data;
  }

  async deleteCategory(id: string): Promise<void> {
    const { error } = await this.client
      .from("categories")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    assertNoError(error);
  }

  // ─── Menu items ─────────────────────────────────────────────────────────────

  async listMenuItems(restaurantId: string): Promise<MenuItem[]> {
    const { data, error } = await this.client
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .is("deleted_at", null)
      .order("sort_order");
    assertNoError(error);
    return data ?? [];
  }

  async createMenuItem(input: CreateMenuItemInput): Promise<MenuItem> {
    const { data, error } = await this.client
      .from("menu_items")
      .insert({
        restaurant_id: input.restaurantId,
        category_id: input.categoryId,
        name: input.name,
        description: input.description ?? null,
        price: input.price,
        image_url: input.imageUrl ?? null,
        is_available: input.isAvailable ?? true,
        sort_order: input.sortOrder ?? 0,
      })
      .select()
      .single();
    assertNoError(error);
    if (!data) throw new Error("Failed to create menu item");
    return data;
  }

  async updateMenuItem(id: string, input: UpdateMenuItemInput): Promise<MenuItem> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.categoryId !== undefined) patch.category_id = input.categoryId;
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.price !== undefined) patch.price = input.price;
    if (input.imageUrl !== undefined) patch.image_url = input.imageUrl;
    if (input.isAvailable !== undefined) patch.is_available = input.isAvailable;
    if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;

    const { data, error } = await this.client
      .from("menu_items")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    assertNoError(error);
    if (!data) throw new Error("Menu item not found");
    return data;
  }

  async deleteMenuItem(id: string): Promise<void> {
    const { error } = await this.client
      .from("menu_items")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    assertNoError(error);
  }

  // ─── Tables ─────────────────────────────────────────────────────────────────

  async listTables(restaurantId: string): Promise<Table[]> {
    const { data, error } = await this.client
      .from("tables")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .is("deleted_at", null)
      .order("label");
    assertNoError(error);
    return data ?? [];
  }

  async createTable(input: CreateTableInput): Promise<Table> {
    const qrCode = `table-${input.label.toLowerCase().replace(/\s+/g, "-")}`;
    const { data, error } = await this.client
      .from("tables")
      .insert({
        restaurant_id: input.restaurantId,
        label: input.label,
        qr_code: qrCode,
        is_active: true,
      })
      .select()
      .single();
    assertNoError(error);
    if (!data) throw new Error("Failed to create table");
    return data;
  }

  async updateTable(id: string, input: UpdateTableInput): Promise<Table> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.label !== undefined) patch.label = input.label;
    if (input.isActive !== undefined) patch.is_active = input.isActive;

    const { data, error } = await this.client
      .from("tables")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    assertNoError(error);
    if (!data) throw new Error("Table not found");
    return data;
  }

  async deleteTable(id: string): Promise<void> {
    const { error } = await this.client
      .from("tables")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", id);
    assertNoError(error);
  }

  // ─── Image upload ─────────────────────────────────────────────────────────

  async uploadMenuImage(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<string> {
    const path = `${Date.now()}-${fileName.replace(/[^a-z0-9._-]/gi, "_")}`;
    const { data, error } = await this.client.storage
      .from("menu-images")
      .upload(path, buffer, { contentType: mimeType, upsert: false });

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Upload returned no data");

    const {
      data: { publicUrl },
    } = this.client.storage.from("menu-images").getPublicUrl(data.path);

    return publicUrl;
  }
}
