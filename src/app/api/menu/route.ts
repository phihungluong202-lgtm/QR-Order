import { NextRequest, NextResponse } from "next/server";
import { demoCategories, demoMenuItems, DEMO_RESTAURANT_SLUG } from "@/lib/demo-data";
import { getServerServices } from "@/services";

export async function GET(request: NextRequest) {
  const restaurant =
    request.nextUrl.searchParams.get("restaurant") ?? DEMO_RESTAURANT_SLUG;
  const services = getServerServices();

  if (services) {
    const menu = await services.menu.getByRestaurantSlug(restaurant);
    if (menu) {
      return NextResponse.json(menu);
    }
  }

  if (restaurant === DEMO_RESTAURANT_SLUG) {
    return NextResponse.json({
      categories: demoCategories,
      items: demoMenuItems,
    });
  }

  return NextResponse.json(
    { error: "Restaurant not found" },
    { status: 404 },
  );
}
