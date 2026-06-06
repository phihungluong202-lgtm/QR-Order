import { NextRequest, NextResponse } from "next/server";
import { demoTables, createDemoTable, DEMO_RESTAURANT_ID } from "@/lib/demo-data";
import { getServerServices } from "@/services";

export async function GET(request: NextRequest) {
  const restaurantId =
    request.nextUrl.searchParams.get("restaurantId") ?? DEMO_RESTAURANT_ID;

  const services = getServerServices();
  if (services) {
    try {
      const tables = await services.admin.listTables(restaurantId);
      return NextResponse.json({ tables });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    tables: demoTables.filter((t) => t.restaurant_id === restaurantId),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { restaurantId?: string; label?: string };
  const { restaurantId = DEMO_RESTAURANT_ID, label } = body;

  if (!label?.trim()) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 });
  }

  const services = getServerServices();
  if (services) {
    try {
      const table = await services.admin.createTable({
        restaurantId,
        label: label.trim(),
      });
      return NextResponse.json({ table }, { status: 201 });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed" },
        { status: 500 },
      );
    }
  }

  const table = createDemoTable(label.trim());
  return NextResponse.json({ table }, { status: 201 });
}
