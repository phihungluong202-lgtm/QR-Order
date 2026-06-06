import { NextRequest, NextResponse } from "next/server";
import {
  updateDemoCategory,
  deleteDemoCategory,
} from "@/lib/demo-data";
import { getServerServices } from "@/services";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json() as {
    name?: string;
    sortOrder?: number;
    isActive?: boolean;
  };

  const services = getServerServices();
  if (services) {
    try {
      const category = await services.admin.updateCategory(id, body);
      return NextResponse.json({ category });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed" },
        { status: 500 },
      );
    }
  }

  const category = updateDemoCategory(id, {
    ...(body.name && { name: body.name }),
    ...(body.sortOrder !== undefined && { sort_order: body.sortOrder }),
    ...(body.isActive !== undefined && { is_active: body.isActive }),
  });
  if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ category });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const services = getServerServices();
  if (services) {
    try {
      await services.admin.deleteCategory(id);
      return NextResponse.json({ success: true });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed" },
        { status: 500 },
      );
    }
  }

  const ok = deleteDemoCategory(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
