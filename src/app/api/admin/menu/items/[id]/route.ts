import { NextRequest, NextResponse } from "next/server";
import { updateDemoMenuItem, deleteDemoMenuItem } from "@/lib/demo-data";
import { getServerServices } from "@/services";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json() as {
    categoryId?: string;
    name?: string;
    description?: string | null;
    price?: number;
    imageUrl?: string | null;
    isAvailable?: boolean;
    sortOrder?: number;
  };

  const services = getServerServices();
  if (services) {
    try {
      const item = await services.admin.updateMenuItem(id, body);
      return NextResponse.json({ item });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed" },
        { status: 500 },
      );
    }
  }

  const item = updateDemoMenuItem(id, {
    ...(body.categoryId !== undefined && { category_id: body.categoryId }),
    ...(body.name !== undefined && { name: body.name }),
    ...(body.description !== undefined && { description: body.description }),
    ...(body.price !== undefined && { price: body.price }),
    ...(body.imageUrl !== undefined && { image_url: body.imageUrl }),
    ...(body.isAvailable !== undefined && { is_available: body.isAvailable }),
    ...(body.sortOrder !== undefined && { sort_order: body.sortOrder }),
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const services = getServerServices();
  if (services) {
    try {
      await services.admin.deleteMenuItem(id);
      return NextResponse.json({ success: true });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed" },
        { status: 500 },
      );
    }
  }

  const ok = deleteDemoMenuItem(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
