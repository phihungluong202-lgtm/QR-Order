"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/database";

interface MenuCategoryTabsProps {
  categories: Category[];
  activeId: string | null;
  onSelect: (categoryId: string) => void;
}

export function MenuCategoryTabs({
  categories,
  activeId,
  onSelect,
}: MenuCategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeId]);

  return (
    <div
      ref={scrollRef}
      className="scrollbar-none flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [-webkit-overflow-scrolling:touch]"
      role="tablist"
      aria-label="Menu categories"
    >
      {categories.map((cat) => {
        const active = cat.id === activeId;
        return (
          <button
            key={cat.id}
            ref={active ? activeRef : undefined}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(cat.id)}
            className={cn(
              "relative shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors touch-manipulation",
              active
                ? "text-primary-foreground"
                : "bg-muted/80 text-muted-foreground hover:bg-muted",
            )}
          >
            {active && (
              <motion.span
                layoutId="menu-category-pill"
                className="absolute inset-0 rounded-full gradient-brand shadow-md"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10">{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}
