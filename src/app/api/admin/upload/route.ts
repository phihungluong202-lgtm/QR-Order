import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getServerServices } from "@/services";

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "Image upload requires Supabase Storage. Configure NEXT_PUBLIC_SUPABASE_URL to enable uploads.",
      },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large (max 5 MB)" },
        { status: 413 },
      );
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP, or GIF images are allowed" },
        { status: 415 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const services = getServerServices();
    if (!services) {
      return NextResponse.json(
        { error: "Storage service unavailable" },
        { status: 503 },
      );
    }

    const url = await services.admin.uploadMenuImage(
      buffer,
      file.name,
      file.type,
    );

    return NextResponse.json({ url });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
