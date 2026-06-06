"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Edit2,
  ImageOff,
  Loader2,
  Plus,
  Tag,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { cn, formatCurrency } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/env";
import {
  useAdminCategories,
  useAdminMenuItems,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
  useUploadImage,
  type CreateItemInput,
} from "@/hooks/use-admin";
import type { Category, MenuItem } from "@/types/database";

// ─── Confirm delete dialog ───────────────────────────────────────────────────

function ConfirmDelete({
  label,
  onConfirm,
  onCancel,
  isPending,
}: {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl"
      >
        <h3 className="font-bold">Delete &ldquo;{label}&rdquo;?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          This action cannot be undone.
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="animate-spin" /> : "Delete"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Item form (create / edit) ───────────────────────────────────────────────

interface ItemFormProps {
  categories: Category[];
  initial?: Partial<MenuItem>;
  onSubmit: (data: CreateItemInput) => void;
  onClose: () => void;
  isPending: boolean;
  error?: Error | null;
}

function ItemForm({
  categories,
  initial,
  onSubmit,
  onClose,
  isPending,
  error,
}: ItemFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(String(initial?.price ?? ""));
  const [categoryId, setCategoryId] = useState(
    initial?.category_id ?? categories[0]?.id ?? "",
  );
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [isAvailable, setIsAvailable] = useState(initial?.is_available ?? true);

  const uploadMutation = useUploadImage();
  const fileRef = useRef<HTMLInputElement>(null);
  const supabaseEnabled = isSupabaseConfigured();

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!categoryId) errs.categoryId = "Category is required";
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) errs.price = "Enter a valid price (≥ 0)";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadMutation.mutateAsync(file);
      setImageUrl(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      categoryId,
      name: name.trim(),
      description: description.trim() || null,
      price: parseFloat(price),
      imageUrl: imageUrl.trim() || null,
      isAvailable,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md overflow-y-auto rounded-2xl border bg-card p-6 shadow-xl"
        style={{ maxHeight: "90dvh" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {initial?.id ? "Edit item" : "Add item"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="item-name">Name *</Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pad Thai"
            />
            {fieldErrors.name && (
              <p className="text-xs text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="item-desc">Description</Label>
            <textarea
              id="item-desc"
              rows={2}
              className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description (optional)"
            />
          </div>

          {/* Price + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="item-price">Price *</Label>
              <Input
                id="item-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
              {fieldErrors.price && (
                <p className="text-xs text-destructive">{fieldErrors.price}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="item-cat">Category *</Label>
              <select
                id="item-cat"
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-1"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {fieldErrors.categoryId && (
                <p className="text-xs text-destructive">
                  {fieldErrors.categoryId}
                </p>
              )}
            </div>
          </div>

          {/* Image */}
          <div className="space-y-1">
            <Label>Image</Label>
            {supabaseEnabled ? (
              <div className="flex gap-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://… or upload a file"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Upload"
                  )}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste image URL (upload needs Supabase Storage)"
              />
            )}
            {imageUrl && (
              <div className="relative mt-2 h-24 w-24 overflow-hidden rounded-xl border">
                <Image
                  src={imageUrl}
                  alt="preview"
                  fill
                  className="object-cover"
                  onError={() => setImageUrl("")}
                />
              </div>
            )}
          </div>

          {/* Available toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={isAvailable}
              onClick={() => setIsAvailable((v) => !v)}
              className={cn(
                "relative h-6 w-11 rounded-full border-2 transition-colors",
                isAvailable
                  ? "border-primary bg-primary"
                  : "border-muted bg-muted",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                  isAvailable ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </button>
            <span className="text-sm">Available on menu</span>
          </div>

          {/* Server error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error.message}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : "Save"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Category form ────────────────────────────────────────────────────────────

function CategoryRow({
  cat,
  onEdit,
  onDelete,
}: {
  cat: Category;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{cat.name}</span>
        {!cat.is_active && (
          <Badge variant="secondary" className="text-xs">Hidden</Badge>
        )}
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(cat)}
        >
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(cat)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = "items" | "categories";

export default function AdminMenuPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("items");
  const [filterCatId, setFilterCatId] = useState<string>("all");

  // Categories state
  const { data: categories = [], isLoading: catsLoading } = useAdminCategories();
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);

  // Items state
  const { data: items = [], isLoading: itemsLoading } = useAdminMenuItems();
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);

  // ── Category handlers ──
  function submitCat(e: React.FormEvent) {
    e.preventDefault();
    if (!catName.trim()) return;
    if (editingCat) {
      updateCat.mutate(
        { id: editingCat.id, name: catName.trim() },
        {
          onSuccess: () => {
            setEditingCat(null);
            setCatName("");
            toast({ title: "Category updated" });
          },
          onError: (err) =>
            toast({ title: "Error", description: err.message, variant: "destructive" }),
        },
      );
    } else {
      createCat.mutate(catName.trim(), {
        onSuccess: () => {
          setCatName("");
          toast({ title: "Category created" });
        },
        onError: (err) =>
          toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  }

  function confirmDeleteCat() {
    if (!deletingCat) return;
    deleteCat.mutate(deletingCat.id, {
      onSuccess: () => {
        setDeletingCat(null);
        toast({ title: "Category deleted" });
      },
      onError: (err) =>
        toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  // ── Item handlers ──
  function submitItem(data: CreateItemInput) {
    if (editingItem) {
      updateItem.mutate(
        { id: editingItem.id, ...data },
        {
          onSuccess: () => {
            setEditingItem(null);
            setShowItemForm(false);
            toast({ title: "Item updated" });
          },
          onError: (err) =>
            toast({ title: "Error", description: err.message, variant: "destructive" }),
        },
      );
    } else {
      createItem.mutate(data, {
        onSuccess: () => {
          setShowItemForm(false);
          toast({ title: "Item added" });
        },
        onError: (err) =>
          toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  }

  function confirmDeleteItem() {
    if (!deletingItem) return;
    deleteItem.mutate(deletingItem.id, {
      onSuccess: () => {
        setDeletingItem(null);
        toast({ title: "Item deleted" });
      },
      onError: (err) =>
        toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  const filteredItems =
    filterCatId === "all"
      ? items
      : items.filter((i) => i.category_id === filterCatId);

  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Menu"
        description="Manage categories and dishes"
        action={
          activeTab === "items" ? (
            <Button
              size="sm"
              onClick={() => {
                setEditingItem(null);
                setShowItemForm(true);
              }}
              disabled={categories.length === 0}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add item
            </Button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="mt-6 flex gap-1 rounded-xl bg-muted p-1 w-fit">
        {(["items", "categories"] as Tab[]).map((tab) => (
          <button
            key={tab}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              activeTab === tab
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Categories tab ── */}
      {activeTab === "categories" && (
        <div className="mt-6 max-w-md space-y-4">
          <form onSubmit={submitCat} className="flex gap-2">
            <Input
              placeholder={editingCat ? `Rename "${editingCat.name}"` : "New category name…"}
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={createCat.isPending || updateCat.isPending}>
              {editingCat ? "Update" : "Add"}
            </Button>
            {editingCat && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setEditingCat(null); setCatName(""); }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </form>

          {catsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="No categories"
              description="Add your first category above."
            />
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {categories.map((cat) => (
                  <motion.div
                    key={cat.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <CategoryRow
                      cat={cat}
                      onEdit={(c) => { setEditingCat(c); setCatName(c.name); }}
                      onDelete={setDeletingCat}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* ── Items tab ── */}
      {activeTab === "items" && (
        <div className="mt-6">
          {/* Category filter */}
          {categories.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {[{ id: "all", name: "All" }, ...categories].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setFilterCatId(c.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                    filterCatId === c.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {itemsLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="No items"
              description={
                categories.length === 0
                  ? "Create a category first, then add items."
                  : "No items in this category yet."
              }
              action={
                categories.length > 0 ? (
                  <Button onClick={() => setShowItemForm(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add first item
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence>
                {filteredItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Card className="overflow-hidden">
                      {/* Image */}
                      <div className="relative h-32 w-full bg-muted">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ImageOff className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                        )}
                        {/* Availability badge */}
                        <span
                          className={cn(
                            "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold",
                            item.is_available
                              ? "bg-emerald-500 text-white"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {item.is_available ? "On" : "Off"}
                        </span>
                      </div>

                      <div className="p-3">
                        <p className="truncate font-semibold leading-tight">
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {catById[item.category_id]?.name ?? "—"}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-bold text-primary">
                            {formatCurrency(item.price)}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingItem(item);
                                setShowItemForm(true);
                              }}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeletingItem(item)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        {/* Quick toggle availability */}
                        <button
                          className="mt-2 w-full rounded-lg border py-1 text-xs font-medium transition-colors hover:bg-muted"
                          onClick={() =>
                            updateItem.mutate({
                              id: item.id,
                              isAvailable: !item.is_available,
                            })
                          }
                        >
                          {item.is_available ? "Hide from menu" : "Show on menu"}
                        </button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {(showItemForm || editingItem) && (
        <ItemForm
          categories={categories}
          initial={editingItem ?? undefined}
          onSubmit={submitItem}
          onClose={() => { setShowItemForm(false); setEditingItem(null); }}
          isPending={createItem.isPending || updateItem.isPending}
          error={createItem.error ?? updateItem.error}
        />
      )}

      {deletingCat && (
        <ConfirmDelete
          label={deletingCat.name}
          onConfirm={confirmDeleteCat}
          onCancel={() => setDeletingCat(null)}
          isPending={deleteCat.isPending}
        />
      )}

      {deletingItem && (
        <ConfirmDelete
          label={deletingItem.name}
          onConfirm={confirmDeleteItem}
          onCancel={() => setDeletingItem(null)}
          isPending={deleteItem.isPending}
        />
      )}
    </div>
  );
}
