"use client";

import { MenuExperience } from "@/components/menu/menu-experience";
import { env } from "@/lib/env";

export default function MenuPage() {
  return (
    <MenuExperience
      restaurantSlug={env.restaurantSlug}
      restaurantName="Demo Bistro"
    />
  );
}
