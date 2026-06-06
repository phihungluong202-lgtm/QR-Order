"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface MenuSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function MenuSearchBar({ value, onChange }: MenuSearchBarProps) {
  return (
    <div className="relative px-4">
      <Search
        className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        placeholder="Search dishes, ingredients…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-full border-muted-foreground/15 bg-muted/50 pl-10 pr-10 text-base shadow-none touch-manipulation"
        aria-label="Search menu"
      />
      {value.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-5 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full"
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
