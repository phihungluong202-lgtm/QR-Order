import { NextRequest, NextResponse } from "next/server";
import { resolveDemoTable } from "@/lib/demo-data";
import { getServerServices } from "@/services";

export async function GET(request: NextRequest) {
  const restaurant = request.nextUrl.searchParams.get("restaurant");
  const qr = request.nextUrl.searchParams.get("qr");

  if (!restaurant || !qr) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const services = getServerServices();

  if (services) {
    try {
      const session = await services.tables.resolveByQr(restaurant, qr);
      if (session) {
        return NextResponse.json(session);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Resolve failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const demo = resolveDemoTable(restaurant, qr);
  if (demo) {
    return NextResponse.json(demo);
  }

  return NextResponse.json({ error: "Table not found" }, { status: 404 });
}
