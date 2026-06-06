import { NextRequest, NextResponse } from "next/server";
import { resolveDemoTableById } from "@/lib/demo-data";
import { env } from "@/lib/env";
import { getServerServices } from "@/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const restaurant =
    request.nextUrl.searchParams.get("restaurant") ?? env.restaurantSlug;

  const services = getServerServices();

  if (services) {
    try {
      const session = await services.tables.resolveById(restaurant, id);
      if (session) {
        return NextResponse.json(session);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Resolve failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const demo = resolveDemoTableById(id);
  if (demo) {
    return NextResponse.json(demo);
  }

  return NextResponse.json({ error: "Table not found" }, { status: 404 });
}
