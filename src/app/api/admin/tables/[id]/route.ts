import { NextRequest, NextResponse } from "next/server";
import { updateDemoTable, deleteDemoTable } from "@/lib/demo-data";
import { getServerServices } from "@/services";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json() as { label?: string; isActive?: boolean };

  const services = getServerServices();
  if (services) {
    try {
      const table = await services.admin.updateTable(id, body);
      return NextResponse.json({ table });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed" },
        { status: 500 },
      );
    }
  }

  const table = updateDemoTable(id, {
    ...(body.label !== undefined && { label: body.label }),
    ...(body.isActive !== undefined && { is_active: body.isActive }),
  });
  if (!table) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ table });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const services = getServerServices();
  if (services) {
    try {
      await services.admin.deleteTable(id);
      return NextResponse.json({ success: true });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed" },
        { status: 500 },
      );
    }
  }

  const ok = deleteDemoTable(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
