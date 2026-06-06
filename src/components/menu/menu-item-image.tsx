"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { getMenuItemImageUrl } from "@/lib/menu-images";
import type { MenuItem } from "@/types/database";

interface MenuItemImageProps {
  item: Pick<MenuItem, "id" | "name" | "image_url">;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export function MenuItemImage({
  item,
  className,
  sizes = "(max-width: 512px) 40vw, 200px",
  priority = false,
}: MenuItemImageProps) {
  const src = getMenuItemImageUrl(item);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        className,
      )}
    >
      <Image
        src={src}
        alt={item.name}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
    </div>
  );
}
