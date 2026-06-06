import {
  DEMO_RESTAURANT_ID,
  DEMO_RESTAURANT_SLUG,
  DEMO_TABLE_IDS,
} from "@/lib/constants";
import type { Category, MenuItem, Order, Table } from "@/types/database";

export { DEMO_RESTAURANT_ID, DEMO_RESTAURANT_SLUG };

const demoTs = {
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  deleted_at: null as string | null,
};

export const demoRestaurant = {
  id: DEMO_RESTAURANT_ID,
  name: "Demo Bistro",
  slug: DEMO_RESTAURANT_SLUG,
  logo_url: null,
  currency: "USD",
  ...demoTs,
};

// eslint-disable-next-line prefer-const
export let demoTables: Table[] = [
  {
    id: DEMO_TABLE_IDS.table1,
    restaurant_id: DEMO_RESTAURANT_ID,
    label: "1",
    qr_code: "table-1",
    is_active: true,
    ...demoTs,
  },
  {
    id: DEMO_TABLE_IDS.table2,
    restaurant_id: DEMO_RESTAURANT_ID,
    label: "2",
    qr_code: "table-2",
    is_active: true,
    ...demoTs,
  },
];

const catIds = {
  starters: "00000000-0000-0000-0000-000000000021",
  mains: "00000000-0000-0000-0000-000000000022",
  drinks: "00000000-0000-0000-0000-000000000023",
};

// eslint-disable-next-line prefer-const
export let demoCategories: Category[] = [
  {
    id: catIds.starters,
    restaurant_id: DEMO_RESTAURANT_ID,
    name: "Starters",
    sort_order: 0,
    is_active: true,
    ...demoTs,
  },
  {
    id: catIds.mains,
    restaurant_id: DEMO_RESTAURANT_ID,
    name: "Mains",
    sort_order: 1,
    is_active: true,
    ...demoTs,
  },
  {
    id: catIds.drinks,
    restaurant_id: DEMO_RESTAURANT_ID,
    name: "Drinks",
    sort_order: 2,
    is_active: true,
    ...demoTs,
  },
];

// eslint-disable-next-line prefer-const
export let demoMenuItems: MenuItem[] = [
  {
    id: "00000000-0000-0000-0000-000000000031",
    restaurant_id: DEMO_RESTAURANT_ID,
    category_id: catIds.starters,
    name: "Crispy Spring Rolls",
    description: "Vegetable rolls with sweet chili dip",
    price: 6.5,
    image_url: null,
    is_available: true,
    sort_order: 0,
    ...demoTs,
  },
  {
    id: "00000000-0000-0000-0000-000000000032",
    restaurant_id: DEMO_RESTAURANT_ID,
    category_id: catIds.starters,
    name: "Tom Yum Soup",
    description: "Spicy, sour, aromatic",
    price: 8,
    image_url: null,
    is_available: true,
    sort_order: 1,
    ...demoTs,
  },
  {
    id: "00000000-0000-0000-0000-000000000033",
    restaurant_id: DEMO_RESTAURANT_ID,
    category_id: catIds.mains,
    name: "Pad Thai",
    description: "Classic stir-fried rice noodles",
    price: 14,
    image_url: null,
    is_available: true,
    sort_order: 0,
    ...demoTs,
  },
  {
    id: "00000000-0000-0000-0000-000000000034",
    restaurant_id: DEMO_RESTAURANT_ID,
    category_id: catIds.mains,
    name: "Green Curry",
    description: "Coconut curry with jasmine rice",
    price: 15.5,
    image_url: null,
    is_available: true,
    sort_order: 1,
    ...demoTs,
  },
  {
    id: "00000000-0000-0000-0000-000000000035",
    restaurant_id: DEMO_RESTAURANT_ID,
    category_id: catIds.drinks,
    name: "Thai Iced Tea",
    description: "Sweet and creamy",
    price: 4.5,
    image_url: null,
    is_available: true,
    sort_order: 0,
    ...demoTs,
  },
];

let demoOrders: Order[] = [];

export function getDemoOrders(restaurantId: string) {
  return demoOrders.filter((o) => o.restaurant_id === restaurantId);
}

export function addDemoOrder(order: Order) {
  demoOrders = [order, ...demoOrders];
  return order;
}

export function updateDemoOrder(
  id: string,
  patch: Partial<Order>,
): Order | null {
  const idx = demoOrders.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  demoOrders[idx] = {
    ...demoOrders[idx],
    ...patch,
    updated_at: new Date().toISOString(),
  };
  return demoOrders[idx];
}

export function resolveDemoTable(slug: string, qr: string) {
  if (slug !== DEMO_RESTAURANT_SLUG) return null;
  const table = demoTables.find((t) => t.qr_code === qr);
  if (!table) return null;
  return { tableId: table.id, restaurantId: DEMO_RESTAURANT_ID, label: table.label };
}

export function resolveDemoTableById(tableIdOrQr: string) {
  const table = demoTables.find(
    (t) => t.id === tableIdOrQr || t.qr_code === tableIdOrQr,
  );
  if (!table) return null;
  return {
    tableId: table.id,
    restaurantId: DEMO_RESTAURANT_ID,
    restaurantSlug: DEMO_RESTAURANT_SLUG,
    label: table.label,
    qrCode: table.qr_code,
  };
}

// ─── Demo CRUD helpers ────────────────────────────────────────────────────────

function demoId() {
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const now = () => new Date().toISOString();

// Categories
export function createDemoCategory(name: string): Category {
  const cat: Category = {
    id: demoId(),
    restaurant_id: DEMO_RESTAURANT_ID,
    name,
    sort_order: demoCategories.length,
    is_active: true,
    created_at: now(),
    updated_at: now(),
    deleted_at: null,
  };
  demoCategories.push(cat);
  return cat;
}

export function updateDemoCategory(
  id: string,
  patch: Partial<Pick<Category, "name" | "sort_order" | "is_active">>,
): Category | null {
  const idx = demoCategories.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  demoCategories[idx] = { ...demoCategories[idx], ...patch, updated_at: now() };
  return demoCategories[idx];
}

export function deleteDemoCategory(id: string): boolean {
  const idx = demoCategories.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  demoCategories.splice(idx, 1);
  return true;
}

// Menu items
export function createDemoMenuItem(
  input: Pick<MenuItem, "category_id" | "name" | "description" | "price" | "image_url">,
): MenuItem {
  const item: MenuItem = {
    id: demoId(),
    restaurant_id: DEMO_RESTAURANT_ID,
    category_id: input.category_id,
    name: input.name,
    description: input.description,
    price: input.price,
    image_url: input.image_url,
    is_available: true,
    sort_order: demoMenuItems.length,
    created_at: now(),
    updated_at: now(),
    deleted_at: null,
  };
  demoMenuItems.push(item);
  return item;
}

export function updateDemoMenuItem(
  id: string,
  patch: Partial<
    Pick<MenuItem, "category_id" | "name" | "description" | "price" | "image_url" | "is_available" | "sort_order">
  >,
): MenuItem | null {
  const idx = demoMenuItems.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  demoMenuItems[idx] = { ...demoMenuItems[idx], ...patch, updated_at: now() };
  return demoMenuItems[idx];
}

export function deleteDemoMenuItem(id: string): boolean {
  const idx = demoMenuItems.findIndex((i) => i.id === id);
  if (idx === -1) return false;
  demoMenuItems.splice(idx, 1);
  return true;
}

// Tables
export function createDemoTable(label: string): Table {
  const qrCode = `table-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const table: Table = {
    id: demoId(),
    restaurant_id: DEMO_RESTAURANT_ID,
    label,
    qr_code: qrCode,
    is_active: true,
    created_at: now(),
    updated_at: now(),
    deleted_at: null,
  };
  demoTables.push(table);
  return table;
}

export function updateDemoTable(
  id: string,
  patch: Partial<Pick<Table, "label" | "is_active">>,
): Table | null {
  const idx = demoTables.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  demoTables[idx] = { ...demoTables[idx], ...patch, updated_at: now() };
  return demoTables[idx];
}

export function deleteDemoTable(id: string): boolean {
  const idx = demoTables.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  demoTables.splice(idx, 1);
  return true;
}

export interface AdminStats {
  activeTableCount: number;
  menuItemCount: number;
  ordersToday: number;
  revenueToday: number;
}

export function getDemoStats(): AdminStats {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayOrders = demoOrders.filter(
    (o) => new Date(o.created_at) >= todayStart,
  );
  return {
    activeTableCount: demoTables.filter((t) => t.is_active).length,
    menuItemCount: demoMenuItems.filter((i) => i.is_available).length,
    ordersToday: todayOrders.length,
    revenueToday: todayOrders.reduce((s, o) => s + (o.total ?? 0), 0),
  };
}
