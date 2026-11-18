"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import ProductImageGrid from "@/components/ProductImageGrid";
import TaggedSpecsInput, { type Spec } from "@/components/admin/TaggedSpecsInput";
import {
  deleteCatalogItem,
  fetchCatalog,
  saveCatalogItem,
  setCatalogPublished,
  uploadProductImage,
  type CatalogItem,
  type CatalogKind,
} from "@/lib/admin-api";


type Form = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  originalPrice: number;
  badge: string;
  stock: string;
  category: string;
  images: string[];
  specs: Spec[];
  highlights: string[];
};

const EMPTY: Form = {
  id: "",
  name: "",
  tagline: "",
  description: "",
  price: 0,
  originalPrice: 0,
  badge: "",
  stock: "in-stock",
  category: "gaming",
  images: [],
  specs: [],
  highlights: [],
};

// Standard values come from the card templates; the admin selects these
// instead of typing them, so data stays consistent with the storefront.
const LAPTOP_CATEGORIES = [
  { value: "gaming", label: "Gaming Laptops" },
  { value: "creator", label: "Creator Laptops" },
  { value: "business", label: "Business & Everyday" },
];

const CONSOLE_CATEGORIES = [
  { value: "gaming", label: "Gaming displays" },
  { value: "creator", label: "Creator displays" },
  { value: "ultrawide", label: "Ultrawide" },
  { value: "office", label: "Everyday" },
];

const LAPTOP_BADGES = ["Best seller", "Flagship", "New", "Pro pick"];
const CONSOLE_BADGES = ["Best seller", "New", "Sale", "Pro pick"];

export default function AdminCatalog({ kind }: { kind: CatalogKind }) {
  const toast = useToast();
  const isLaptop = kind === "laptops";
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchCatalog(kind);
      setItems(result.items);
    } catch (error) {
      toast.error((error as { error?: string }).error ?? `Could not load ${kind}.`);
    } finally {
      setLoading(false);
    }
  }, [kind, toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function startCreate() {
    setEditing(null);
    setForm({ ...EMPTY, specs: [], highlights: [], images: [] });
  }

  function startEdit(item: CatalogItem) {
    const d = item.data;
    setEditing(item.id);
    setForm({
      id: item.id,
      name: String(d.name ?? ""),
      tagline: String(d.tagline ?? ""),
      description: String(d.description ?? ""),
      price: Number(d.price ?? 0),
      originalPrice: Number(d.originalPrice ?? 0),
      badge: String(d.badge ?? ""),
      stock: String(d.stock ?? "in-stock"),
      category: String(d.category ?? "gaming"),
      images: Array.isArray(d.images) ? (d.images as string[]) : d.image ? [String(d.image)] : [],
      specs: Array.isArray(d.specs)
        ? (d.specs as Spec[]).map((s) => ({ label: String(s.label ?? ""), value: String(s.value ?? "") }))
        : [],
      highlights: Array.isArray(d.highlights) ? (d.highlights as string[]).map(String) : [],
    });
  }

  async function handleImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, 3);

    if (files.length === 0) return;

    setUploading(true);

    try {
      const urls: string[] = [];

      for (const file of files) {
        const result = await uploadProductImage(file);
        urls.push(result.url);
      }

      setForm((current) => ({ ...current, images: urls }));
      toast.success(`${urls.length} image${urls.length > 1 ? "s" : ""} uploaded.`);
    } catch (error) {
      toast.error((error as { error?: string }).error ?? "Could not upload images.");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index: number) {
    setForm((current) => ({ ...current, images: current.images.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        id: editing ?? (form.id || crypto.randomUUID()),
        name: form.name,
        tagline: form.tagline,
        description: form.description,
        price: form.price,
        originalPrice: form.originalPrice || undefined,
        badge: form.badge || undefined,
        stock: form.stock,
        category: form.category,
        images: form.images,
        specs: form.specs.filter((s) => s.label && s.value),
        highlights: form.highlights.filter(Boolean),
      };

      await saveCatalogItem(kind, payload, editing ?? (form.id || undefined));
      toast.success(editing ? "Item updated." : "Item created.");
      await load();
      startCreate();
    } catch (error) {
      toast.error((error as { error?: string }).error ?? "Could not save item.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(item: CatalogItem) {
    try {
      await setCatalogPublished(kind, item.id, !item.published);
      toast.success(item.published ? "Item unpublished." : "Item published.");
      await load();
    } catch (error) {
      toast.error((error as { error?: string }).error ?? "Could not update item.");
    }
  }

  async function handleDelete(item: CatalogItem) {
    if (!window.confirm(`Delete ${String(item.data.name ?? "this item")}?`)) return;

    try {
      await deleteCatalogItem(kind, item.id);
      toast.success("Item deleted.");
      await load();
    } catch (error) {
      toast.error((error as { error?: string }).error ?? "Could not delete item.");
    }
  }

  const previewImages = form.images.map((url) =>
    url.startsWith("/api/images/")
      ? `${process.env.NEXT_PUBLIC_API_BASE_URL || "https://generic-pcs-api.pcmarketweb.workers.dev"}${url}`
      : url
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {isLaptop ? "Laptops" : "Consoles"}
          </h1>
          <p className="mt-1 text-sm text-[#5c5e66]">
            Create and publish {isLaptop ? "laptop" : "console"} products. Published items appear on the storefront.
          </p>
        </div>
        <button type="button" onClick={startCreate} className="inline-flex h-10 items-center rounded-xl bg-[#5865F2] px-4 text-sm font-semibold text-white hover:bg-[#4752C4]">
          + New {isLaptop ? "laptop" : "console"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 rounded-2xl border border-[#dce3ee] bg-white p-5 shadow-card">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ID (slug)">
              <input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="auto-generated if blank" className={inputClass} />
            </Field>
            <Field label="Name">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
            </Field>
          </div>

          <Field label="Tagline">
            <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className={inputClass} />
          </Field>

          <Field label="Description">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={inputClass} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Price (USD)">
              <input type="number" min="0" step="0.01" value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className={inputClass} required />
            </Field>
            <Field label="Original price">
              <input type="number" min="0" step="0.01" value={form.originalPrice || ""} onChange={(e) => setForm({ ...form, originalPrice: Number(e.target.value) })} className={inputClass} />
            </Field>
            <Field label="Badge">
              <select value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} className={inputClass}>
                <option value="">No badge</option>
                {(isLaptop ? LAPTOP_BADGES : CONSOLE_BADGES).map((badge) => (
                  <option key={badge} value={badge}>{badge}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                {(isLaptop ? LAPTOP_CATEGORIES : CONSOLE_CATEGORIES).map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Stock">
              <select value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={inputClass}>
                <option value="in-stock">In stock</option>
                <option value={isLaptop ? "built-in-order" : "built-to-order"}>
                  Built to order
                </option>
              </select>
            </Field>
          </div>

          <Field label="Images (up to 3 — first is the large one)">
            <div className="space-y-3">
              <input type="file" accept="image/*" multiple onChange={handleImages} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#eaf0f8] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#4752C4]" />
              {uploading && <p className="text-xs text-[#5865F2]">Uploading…</p>}
              <p className="text-xs text-[#80848e]">{form.images.length}/3 images · select up to three at once</p>
              {form.images.map((url, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-[11px] font-semibold text-[#80848e]">{index === 0 ? "Large" : `Small ${index}`}</span>
                  <input value={url} readOnly className={inputClass} />
                  <button type="button" onClick={() => removeImage(index)} className="shrink-0 rounded-lg border border-[#d2dbe8] px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:border-red-400">Remove</button>
                </div>
              ))}
            </div>
          </Field>

          <TaggedSpecsInput
            kind={isLaptop ? "laptop" : "console"}
            specs={form.specs}
            onChange={(specs) => setForm({ ...form, specs })}
          />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">Highlights</span>
              <button type="button" onClick={() => setForm({ ...form, highlights: [...form.highlights, ""] })} className="text-xs font-semibold text-[#5865F2]">+ Add highlight</button>
            </div>
            {form.highlights.map((h, index) => (
              <div key={index} className="mb-2 flex gap-2">
                <input value={h} onChange={(e) => {
                  const next = [...form.highlights]; next[index] = e.target.value; setForm({ ...form, highlights: next });
                }} className={inputClass} />
                <button type="button" onClick={() => setForm({ ...form, highlights: form.highlights.filter((_, i) => i !== index) })} className="text-red-600">×</button>
              </div>
            ))}
          </div>

          <button type="submit" disabled={saving || uploading} className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white hover:bg-[#4752C4] disabled:opacity-50">
            {saving ? "Saving…" : editing ? "Save changes" : "Create item"}
          </button>
        </div>

        <div className="rounded-2xl border border-[#dce3ee] bg-white p-5 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">Card preview</p>
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#dce3ee]">
            <div className="aspect-[4/3]">
              <ProductImageGrid images={previewImages} alt={form.name || "Product"} interactive={false} />
            </div>
            <div className="space-y-1 p-4">
              <h3 className="font-semibold">{form.name || "Product name"}</h3>
              <p className="text-xs text-[#5865F2]">{form.tagline || "Tagline"}</p>
              <p className="text-lg font-bold text-[#5865F2]">${form.price || 0}</p>
            </div>
          </div>
        </div>
      </form>

      <div className="mt-8 overflow-hidden rounded-2xl border border-[#dce3ee] bg-white shadow-card">
        {loading ? (
          <div className="p-10 text-center text-sm text-[#5c5e66]">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#5c5e66]">No items yet. Create one above.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#e4e9f0] bg-[#f8fafe] text-[11px] uppercase tracking-wide text-[#80848e]">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-[#eef1f6] last:border-0">
                  <td className="px-4 py-3 font-semibold">{String(item.data.name ?? item.id)}</td>
                  <td className="px-4 py-3">${Number(item.data.price ?? 0)}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => handlePublish(item)} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${item.published ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : "border-slate-500/30 bg-slate-500/10 text-slate-600"}`}>
                      {item.published ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button type="button" onClick={() => startEdit(item)} className="font-semibold text-[#5865F2]">Edit</button>
                    <button type="button" onClick={() => handleDelete(item)} className="font-semibold text-red-600">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const inputClass = "h-10 w-full rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm outline-none focus:border-[#5865F2]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">{label}</span>
      {children}
    </label>
  );
}
