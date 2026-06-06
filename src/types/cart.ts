import type { MenuItem } from "@/types/database";

export interface CartLine {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export interface CartState {
  tableId: string | null;
  restaurantId: string | null;
  lines: CartLine[];
}
