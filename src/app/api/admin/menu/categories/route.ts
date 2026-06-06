import { NextRequest, NextResponse } from "next/server";
import {
  demoCategories,
  createDemoCategory,
  DEMO_RESTAURANT_ID,
} from "@/lib/demo-data";
import { getServerServices } from "@/services";

export async function GET(request: NextRequest) {
  const restaurantId =
    request.nextUrl.searchParams.get("restaurantId") ?? DEMO_RESTAURANT_ID;

  const services = getServerServices();
  if (services) {
    try {
      const categories = await services.admin.listCategories(restaurantId);
      return NextResponse.json({ categories });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    categories: demoCategories.filter((c) => c.restaurant_id === restaurantId),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { restaurantId?: string; name?: string };
  const { restaurantId = DEMO_RESTAURANT_ID, name } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const services = getServerServices();
  if (services) {
    try {
      const category = await services.admin.createCategory({
        restaurantId,
        name: name.trim(),
      });
      return NextResponse.json({ category }, { status: 201 });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed" },
        { status: 500 },
      );
    }
  }

  const category = createDemoCategory(name.trim());
  return NextResponse.json({ category }, { status: 201 });
}
