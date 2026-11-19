"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import ProductImageGrid from "@/components/ProductImageGrid";
import TaggedSpecsInput, { type Spec } from "@/components/admin/TaggedSpecsInput";
import { specsToSummary } from "@/data/spec-tags";
import {
  createProduct,
  deleteProduct,
  fetchAdminProducts,
  setProductPublished,
  updateProduct,
  uploadProductImage,
  type Product,
  type ProductInput,
} from "@/lib/admin-api";

const EMPTY_FORM: ProductInput = {
  name: "",
  image: "",
  images: [],
  brand: "intel",
  price: 0,
  originalPrice: 0,
  stock: "in-stock",
  flagship: false,
  specs: "",
  featured: false,
  featuredOrder: 0,
  promoCode: null,
  promoDiscount: 10,
  promoEnabled: false,
  published: true,
};

export default function AdminProducts() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductInput>(EMPTY_FORM);
  const [specDraft, setSpecDraft] = useState<Spec[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminProducts();
      setProducts(result.products);
    } catch (error) {
      toast.error((error as { error?: string }).error ?? "Could not load products.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function startCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setSpecDraft([]);
  }

  function startEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      image: product.image,
      images: product.images ?? [],
      brand: product.brand,
      price: product.price,
      originalPrice: product.originalPrice,
      stock: product.stock,
      flagship: product.flagship,
      specs: product.specs,
      featured: product.featured,
      featuredOrder: product.featuredOrder,
      promoCode: product.promoCode,
      promoDiscount: product.promoDiscount || 10,
      promoEnabled: product.promoEnabled,
      published: product.published,
    });
    setSpecDraft(parseLegacySpecs(product.specs));
  }

  function parseLegacySpecs(raw: string): Spec[] {
    if (!raw) return [];

    return raw
      .split(" · ")
      .map((part) => {
        const separator = part.indexOf(":");
        if (separator > 0) {
          return {
            label: part.slice(0, separator).trim(),
            value: part.slice(separator + 1).trim(),
          };
        }
        return { label: "Details", value: part.trim() };
      })
      .filter((spec) => spec.value);
  }

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, 20);

    if (files.length === 0) return;

    setUploading(true);

    try {
      const uploaded: string[] = [];

      for (const file of files) {
        const result = await uploadProductImage(file);
        uploaded.push(result.url);
      }

      const base = process.env.NEXT_PUBLIC_API_BASE_URL || "https://generic-pcs-api.pcmarketweb.workers.dev";

      setForm((current) => ({
        ...current,
        image: uploaded[0],
        images: uploaded,
      }));


      toast.success(`${uploaded.length} image${uploaded.length > 1 ? "s" : ""} uploaded (max 20).`);
    } catch (error) {
      toast.error((error as { error?: string }).error ?? "Could not upload images.");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index: number) {
    setForm((current) => {
      const images = current.images.filter((_, i) => i !== index);
      return {
        ...current,
        images,
        image: images[0] ?? "",
      };
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...form,
        specs: specsToSummary(specDraft) || form.specs,
      };

      if (editing) {
        await updateProduct(editing.id, payload);
        toast.success("Product updated.");
      } else {
        await createProduct(payload);
        toast.success("Product published.");
      }

      await load();
      startCreate();
    } catch (error) {
      toast.error((error as { error?: string }).error ?? "Could not save product.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(product: Product) {
    try {
      await setProductPublished(product.id, !product.published);
      toast.success(product.published ? "Product unpublished." : "Product published.");
      await load();
    } catch (error) {
      toast.error((error as { error?: string }).error ?? "Could not update product.");
    }
  }

  async function handleDelete(product: Product) {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;

    try {
      await deleteProduct(product.id);
      toast.success("Product deleted.");
      await load();
    } catch (error) {
      toast.error((error as { error?: string }).error ?? "Could not delete product.");
    }
  }

  const discount = form.originalPrice > 0
    ? Math.round((1 - form.price / form.originalPrice) * 100)
    : 0;

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "https://generic-pcs-api.pcmarketweb.workers.dev";
  const previewImages = form.images.map((url) =>
    url.startsWith("/api/images/") ? `${apiBase}${url}` : url
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-[#5c5e66]">
            Published products appear on the prebuilds page.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex h-10 items-center rounded-xl bg-[#5865F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
        >
          + New product
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-[#dce3ee] bg-white p-5 shadow-card"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">
              {editing ? `Edit: ${editing.name}` : "New product"}
            </h2>
            {editing && (
              <button
                type="button"
                onClick={startCreate}
                className="text-sm font-semibold text-[#5865F2]"
              >
                Cancel edit
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
            </Field>

            <Field label="Brand">
              <select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value as ProductInput["brand"] })} className={inputClass}>
                <option value="intel">Intel</option>
                <option value="amd">AMD</option>
              </select>
            </Field>
          </div>

          <TaggedSpecsInput
            kind="prebuild"
            specs={specDraft}
            onChange={setSpecDraft}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price (USD)">
              <input type="number" min="0" step="0.01" value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className={inputClass} required />
            </Field>
            <Field label="Original price (USD)">
              <input type="number" min="0" step="0.01" value={form.originalPrice || ""} onChange={(e) => setForm({ ...form, originalPrice: Number(e.target.value) })} className={inputClass} required />
            </Field>
          </div>

          <p className="text-xs text-[#80848e]">
            Discount shown on card: <span className="font-semibold text-[#B91C1C]">{discount > 0 ? `Save ${discount}%` : "no discount"}</span>
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Stock">
              <select value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value as ProductInput["stock"] })} className={inputClass}>
                <option value="in-stock">In stock</option>
                <option value="built-to-order">Built to order</option>
              </select>
            </Field>
            <Field label="Featured order">
              <input type="number" value={form.featuredOrder} onChange={(e) => setForm({ ...form, featuredOrder: Number(e.target.value) })} className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Checkbox label="Flagship badge" checked={form.flagship} onChange={(v) => setForm({ ...form, flagship: v })} />
            <Checkbox label="Featured" checked={form.featured} onChange={(v) => setForm({ ...form, featured: v })} />
            <Checkbox label="Published" checked={form.published} onChange={(v) => setForm({ ...form, published: v })} />
          </div>


          <Field label="Product images (up to 20 — first is the large one)">
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFiles}
                className="block w-full text-sm text-[#5c5e66] file:mr-3 file:rounded-lg file:border-0 file:bg-[#eaf0f8] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#4752C4]"
              />
              {uploading && <p className="text-xs text-[#5865F2]">Uploading…</p>}
              <p className="text-xs text-[#80848e]">
                {form.images.length}/20 images · select up to twenty at once
              </p>

              {form.images.map((url, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-[11px] font-semibold text-[#80848e]">
                    {index === 0 ? "Large" : `Small ${index}`}
                  </span>
                  <input value={url} readOnly className={inputClass} />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="shrink-0 rounded-lg border border-[#d2dbe8] px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:border-red-400"
                  >
                    Remove
                  </button>
                </div>
              ))}

              <input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value, images: [e.target.value, ...form.images.slice(1, 3)] })}
                placeholder="Or type an image path, e.g. /hero_image.png"
                className={inputClass}
              />
            </div>
          </Field>

          <button
            type="submit"
            disabled={saving || uploading}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4] disabled:opacity-50"
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Create product"}
          </button>
        </form>

        {/* Card preview */}
        <div className="rounded-2xl border border-[#dce3ee] bg-white p-5 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">Card preview</p>
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#dce3ee] bg-[#eaf0f8]">
            <div className="relative aspect-[4/3] bg-[#dce3ee]">
              <ProductImageGrid images={previewImages} alt="" interactive={false} />
              {form.flagship && (
                <span className="absolute bottom-3 left-3 text-[10px] font-bold uppercase tracking-wide text-[#5865F2]">Flagship</span>
              )}
            </div>
            <div className="space-y-2 p-4">
              <h3 className="text-base font-semibold">{form.name || "Product name"}</h3>
              <p className="text-sm text-[#5c5e66]">{form.specs || "Specs appear here"}</p>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-xl font-bold text-[#5865F2]">${form.price || 0}</span>
                <span className="text-sm text-[#80848e] line-through">${form.originalPrice || 0}</span>
                {discount > 0 && <span className="rounded-full bg-[#DC2626]/10 px-2 py-0.5 text-[10px] font-bold text-[#B91C1C]">Save {discount}%</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product list */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-[#dce3ee] bg-white shadow-card">
        {loading ? (
          <div className="p-10 text-center text-sm text-[#5c5e66]">Loading products…</div>
        ) : products.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#5c5e66]">No products yet. Create one above.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#e4e9f0] bg-[#f8fafe] text-[11px] uppercase tracking-wide text-[#80848e]">
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Published</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-[#eef1f6] last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-xs text-[#80848e]">{product.brand} · {product.stock}</p>
                  </td>
                  <td className="px-4 py-3">${product.price}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handlePublish(product)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                        product.published
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                          : "border-slate-500/30 bg-slate-500/10 text-slate-600"
                      }`}
                    >
                      {product.published ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button type="button" onClick={() => startEdit(product)} className="font-semibold text-[#5865F2]">Edit</button>
                    <button type="button" onClick={() => handleDelete(product)} className="font-semibold text-red-600">Delete</button>
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

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-[#5c5e66]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#5865F2]" />
      {label}
    </label>
  );
}
