"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  size = "md",
  className,
}: QuantitySelectorProps) {
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const btn = size === "sm" ? "h-9 w-9" : "h-11 w-11";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-background p-1 shadow-sm",
        className,
      )}
      role="group"
      aria-label="Quantity"
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(btn, "rounded-full touch-manipulation")}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrease quantity"
      >
        <Minus className={icon} />
      </Button>
      <span
        className={cn(
          "min-w-[2rem] text-center font-bold tabular-nums",
          size === "sm" ? "text-sm" : "text-base",
        )}
        aria-live="polite"
      >
        {value}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(btn, "rounded-full touch-manipulation")}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Increase quantity"
      >
        <Plus className={icon} />
      </Button>
    </div>
  );
}
