import { NextRequest, NextResponse } from "next/server";
import { getDemoStats, DEMO_RESTAURANT_ID } from "@/lib/demo-data";
import { getServerServices } from "@/services";

export async function GET(request: NextRequest) {
  const restaurantId =
    request.nextUrl.searchParams.get("restaurantId") ?? DEMO_RESTAURANT_ID;

  const services = getServerServices();
  if (services) {
    try {
      const stats = await services.admin.getStats(restaurantId);
      return NextResponse.json(stats);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to fetch stats";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json(getDemoStats());
}
