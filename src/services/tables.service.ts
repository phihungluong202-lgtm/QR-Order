import { getRestaurantIdBySlug } from "@/lib/database/helpers";
import { assertNoError, isNotFoundError } from "@/lib/database/errors";
import type { TypedSupabaseClient } from "@/lib/database/helpers";
import type { Table } from "@/types/database";

export interface ResolvedTableSession {
  tableId: string;
  restaurantId: string;
  label?: string;
  qrCode?: string;
  restaurantSlug?: string;
}

export class TablesService {
  constructor(private readonly client: TypedSupabaseClient) {}

  async resolveByQr(
    restaurantSlug: string,
    qrCode: string,
  ): Promise<ResolvedTableSession | null> {
    const restaurantId = await getRestaurantIdBySlug(
      this.client,
      restaurantSlug,
    );
    if (!restaurantId) return null;

    const { data, error } = await this.client
      .from("tables")
      .select("id, restaurant_id")
      .eq("restaurant_id", restaurantId)
      .eq("qr_code", qrCode)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (isNotFoundError(error)) return null;
    assertNoError(error);
    if (!data) return null;

    return {
      tableId: data.id,
      restaurantId: data.restaurant_id,
    };
  }

  async resolveById(
    restaurantSlug: string,
    tableIdOrQr: string,
  ): Promise<ResolvedTableSession | null> {
    const restaurantId = await getRestaurantIdBySlug(
      this.client,
      restaurantSlug,
    );
    if (!restaurantId) return null;

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        tableIdOrQr,
      );

    let query = this.client
      .from("tables")
      .select("id, restaurant_id, label, qr_code")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .is("deleted_at", null);

    query = isUuid
      ? query.eq("id", tableIdOrQr)
      : query.eq("qr_code", tableIdOrQr);

    const { data, error } = await query.maybeSingle();

    if (isNotFoundError(error)) return null;
    assertNoError(error);
    if (!data) return null;

    return {
      tableId: data.id,
      restaurantId: data.restaurant_id,
      label: data.label,
      qrCode: data.qr_code,
      restaurantSlug,
    };
  }

  async listByRestaurant(restaurantId: string): Promise<Table[]> {
    const { data, error } = await this.client
      .from("tables")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("label");

    assertNoError(error);
    return data ?? [];
  }
}
