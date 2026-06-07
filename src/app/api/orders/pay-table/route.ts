import { NextRequest, NextResponse } from "next/server";
import { getServerServices } from "@/services";

export async function POST(request: NextRequest) {
  const body = await request.json() as { tableId?: string };
  const { tableId } = body;

  if (!tableId) {
    return NextResponse.json({ error: "tableId is required" }, { status: 400 });
  }

  const services = getServerServices();
  if (!services) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    const result = await services.orders.payTable(tableId);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Payment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
