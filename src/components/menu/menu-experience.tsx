"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Utensils } from "lucide-react";
import { useMenu } from "@/hooks/use-menu";
import { EmptyState } from "@/components/layout/empty-state";
import { MenuSearchBar } from "@/components/menu/menu-search-bar";
import { MenuCategoryTabs } from "@/components/menu/menu-category-tabs";
import { MenuFoodCard } from "@/components/menu/menu-food-card";
import { MenuItemDetailModal } from "@/components/menu/menu-item-detail-modal";
import { MenuFloatingCart } from "@/components/menu/menu-floating-cart";
import { useAddToCartBurst } from "@/components/menu/add-to-cart-burst";
import { useToast } from "@/components/ui/use-toast";
import { useCartStore } from "@/stores/cart-store";
import type { MenuItem, Category } from "@/types/database";

interface MenuExperienceProps {
  restaurantSlug: string;
  tableLabel?: string;
  restaurantName?: string;
}

// ─── Skeleton card — mirrors MenuFoodCard layout exactly ─────────────────────

function FoodCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm" aria-hidden="true">
      <div className="skeleton aspect-[16/10] w-full rounded-none" />
      <div className="px-3.5 pt-3 pb-2 space-y-2">
        <div className="skeleton h-4 w-3/4 rounded-full" />
        <div className="skeleton h-3 w-full rounded-full" />
        <div className="skeleton h-3 w-2/3 rounded-full" />
        <div className="skeleton h-5 w-1/3 rounded-full" />
      </div>
      <div className="border-t px-3 py-2.5">
        <div className="skeleton h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

function MenuSkeletonGrid() {
  return (
    <div className="space-y-8">
      {/* Category heading placeholder */}
      <div className="space-y-3">
        <div className="skeleton h-6 w-32 rounded-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <FoodCardSkeleton key={i} />)}
        </div>
      </div>
      <div className="space-y-3">
        <div className="skeleton h-6 w-24 rounded-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => <FoodCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MenuExperience({
  restaurantSlug,
  tableLabel,
  restaurantName = "Menu",
}: MenuExperienceProps) {
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const scrollingByTab = useRef(false);

  const addItem = useCartStore((s) => s.addItem);
  const { triggerBurst } = useAddToCartBurst();
  const { toast } = useToast();

  const { data, isLoading, isError } = useMenu(restaurantSlug);

  const categories = useMemo(() => data?.categories ?? [], [data?.categories]);
  const items = useMemo(() => data?.items ?? [], [data?.items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q),
    );
  }, [items, search]);

  const isSearching = search.trim().length > 0;

  const grouped = useMemo(
    () =>
      categories
        .map((cat) => ({
          category: cat,
          items: filteredItems.filter((i) => i.category_id === cat.id),
        }))
        .filter((g) => g.items.length > 0),
    [categories, filteredItems],
  );

  useEffect(() => {
    if (categories.length && !activeCategoryId) {
      setActiveCategoryId(categories[0]!.id);
    }
  }, [categories, activeCategoryId]);

  useEffect(() => {
    if (isSearching || grouped.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollingByTab.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (top?.target.id.startsWith("category-")) {
          setActiveCategoryId(top.target.id.replace("category-", ""));
        }
      },
      { root: null, rootMargin: "-40% 0px -45% 0px", threshold: [0, 0.15, 0.35, 0.5] },
    );

    for (const { category } of grouped) {
      const el = sectionRefs.current[category.id];
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [grouped, isSearching]);

  const scrollToCategory = useCallback((categoryId: string) => {
    const el = sectionRefs.current[categoryId];
    if (!el) return;
    scrollingByTab.current = true;
    setActiveCategoryId(categoryId);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => { scrollingByTab.current = false; }, 600);
  }, []);

  const handleAdd = useCallback(
    (item: MenuItem, options?: { quantity?: number; notes?: string }, buttonEl?: HTMLButtonElement | null) => {
      addItem(item, options);
      triggerBurst(buttonEl ?? null);
      toast({ title: "Added to cart", description: item.name });
    },
    [addItem, triggerBurst, toast],
  );

  return (
    <div className="menu-scroll pb-32">
      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden gradient-brand px-4 pb-7 pt-5 text-brand-foreground safe-top">
        {/* Background blobs */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-4 left-4 h-20 w-20 rounded-full bg-white/5 blur-xl" />

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative"
        >
          {tableLabel ? (
            <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Table {tableLabel}
            </div>
          ) : (
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Dine-in</p>
          )}
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight drop-shadow-sm">
            {restaurantName}
          </h1>
          <p className="mt-0.5 text-sm opacity-80">
            Tap a dish to view details &amp; add to cart
          </p>
        </motion.div>
      </div>

      {/* ── Sticky search + category bar ─────────────────────────────────── */}
      <div className="glass sticky top-0 z-30 space-y-3 border-b py-3">
        <MenuSearchBar value={search} onChange={setSearch} />
        {!isSearching && categories.length > 0 && (
          <MenuCategoryTabs
            categories={categories}
            activeId={activeCategoryId}
            onSelect={scrollToCategory}
          />
        )}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-lg px-4 py-4">
        {isLoading && <MenuSkeletonGrid />}

        {isError && (
          <EmptyState
            className="mt-4"
            icon={Utensils}
            title="Menu unavailable"
            description="Check your connection or ask staff for help."
          />
        )}

        {!isLoading && !isError && grouped.length === 0 && (
          <EmptyState
            className="mt-4"
            icon={Utensils}
            title={isSearching ? "No matches" : "Menu coming soon"}
            description={
              isSearching
                ? "Try another keyword or browse categories."
                : "Items will appear here once the restaurant adds them."
            }
          />
        )}

        {!isLoading && !isError && grouped.length > 0 && (
          <div className="space-y-8">
            {isSearching && (
              <p className="text-sm text-muted-foreground">
                {filteredItems.length} result{filteredItems.length === 1 ? "" : "s"}
              </p>
            )}
            {grouped.map(({ category, items: catItems }) => (
              <CategorySection
                key={category.id}
                category={category}
                items={catItems}
                hideTitle={isSearching && grouped.length === 1}
                sectionRef={(el) => { sectionRefs.current[category.id] = el; }}
                onOpenDetail={(item) => { setDetailItem(item); setDetailOpen(true); }}
                onQuickAdd={(item, el) => handleAdd(item, { quantity: 1 }, el)}
              />
            ))}
          </div>
        )}
      </div>

      <MenuItemDetailModal
        item={detailItem}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onAdd={(item, opts, el) => handleAdd(item, opts, el)}
      />

      <MenuFloatingCart />
    </div>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────

function CategorySection({
  category,
  items,
  hideTitle,
  sectionRef,
  onOpenDetail,
  onQuickAdd,
}: {
  category: Category;
  items: MenuItem[];
  hideTitle: boolean;
  sectionRef: (el: HTMLElement | null) => void;
  onOpenDetail: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem, el: HTMLButtonElement | null) => void;
}) {
  return (
    <section
      id={`category-${category.id}`}
      ref={sectionRef}
      className="menu-section scroll-mt-[11rem]"
    >
      {!hideTitle && (
        <h2 className="mb-3 text-lg font-extrabold tracking-tight">{category.name}</h2>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item, index) => (
          <MenuFoodCard
            key={item.id}
            item={item}
            index={index}
            onOpenDetail={onOpenDetail}
            onQuickAdd={onQuickAdd}
          />
        ))}
      </div>
    </section>
  );
}
