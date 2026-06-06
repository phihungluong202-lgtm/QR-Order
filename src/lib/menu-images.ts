import type { MenuItem } from "@/types/database";

const FOOD_IMAGES = [
  "https://images.unsplash.com/photo-1546069901-ba9599a1e63f?w=600&q=80",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7505?w=600&q=80",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80",
  "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&q=80",
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * 31) % 9973;
  return h;
}

export function getMenuItemImageUrl(item: Pick<MenuItem, "id" | "image_url">): string {
  if (item.image_url?.trim()) return item.image_url.trim();
  return FOOD_IMAGES[hashId(item.id) % FOOD_IMAGES.length]!;
}
