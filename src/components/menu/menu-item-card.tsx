"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { MenuItem } from "@/types/database";

interface MenuItemCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
  index?: number;
}

export function MenuItemCard({ item, onAdd, index = 0 }: MenuItemCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className="flex gap-4 rounded-2xl border bg-card p-4 shadow-sm"
    >
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent text-2xl">
        🍽️
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="font-semibold leading-tight">{item.name}</h3>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {item.description}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-bold text-primary">
            {formatCurrency(item.price)}
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="h-9 w-9 rounded-full p-0"
            onClick={() => onAdd(item)}
            disabled={!item.is_available}
            aria-label={`Add ${item.name}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
