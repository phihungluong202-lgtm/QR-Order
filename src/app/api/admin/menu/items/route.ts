import { NextRequest, NextResponse } from "next/server";
import {
  demoMenuItems,
  createDemoMenuItem,
  DEMO_RESTAURANT_ID,
} from "@/lib/demo-data";
import { getServerServices } from "@/services";

export async function GET(request: NextRequest) {
  const restaurantId =
    request.nextUrl.searchParams.get("restaurantId") ?? DEMO_RESTAURANT_ID;

  const services = getServerServices();
  if (services) {
    try {
      const items = await services.admin.listMenuItems(restaurantId);
      return NextResponse.json({ items });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    items: demoMenuItems.filter((i) => i.restaurant_id === restaurantId),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    restaurantId?: string;
    categoryId?: string;
    name?: string;
    description?: string | null;
    price?: number;
    imageUrl?: string | null;
    isAvailable?: boolean;
  };

  const {
    restaurantId = DEMO_RESTAURANT_ID,
    categoryId,
    name,
    description = null,
    price,
    imageUrl = null,
    isAvailable = true,
  } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!categoryId) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }
  if (price === undefined || price < 0) {
    return NextResponse.json({ error: "Valid price is required" }, { status: 400 });
  }

  const services = getServerServices();
  if (services) {
    try {
      const item = await services.admin.createMenuItem({
        restaurantId,
        categoryId,
        name: name.trim(),
        description,
        price,
        imageUrl,
        isAvailable,
      });
      return NextResponse.json({ item }, { status: 201 });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed" },
        { status: 500 },
      );
    }
  }

  const item = createDemoMenuItem({
    category_id: categoryId,
    name: name.trim(),
    description: description ?? null,
    price,
    image_url: imageUrl,
  });
  return NextResponse.json({ item }, { status: 201 });
}
