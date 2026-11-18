"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { useRegion } from "@/components/RegionProvider";
import { useToast } from "@/components/ToastProvider";
import ProductGallery from "@/components/ProductGallery";
import { resolveImageUrls, resolveImageUrl } from "@/lib/image-url";
import {
  cartItemFromConsole,
  cartItemFromLaptop,
  cartItemFromPrebuild,
  type CartItem,
} from "@/data/cart";
import {
  laptopCategories,
  type Laptop,
  type LaptopCategory,
} from "@/data/laptops";
import {
  consoleCategories,
  type Console,
  type ConsoleCategory,
} from "@/data/consoles";
import type { Prebuild } from "@/data/prebuilds";

type Kind = "prebuilds" | "laptops" | "consoles";

type DetailProduct = {
  id: string;
  name: string;
  description: string;
  tagline?: string;
  price: number;
  originalPrice?: number;
  images: string[];
  specs: { label: string; value: string }[];
  highlights: string[];
  stock: string;
  badge?: string;
  category?: string;
  brand?: string;
};

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://generic-pcs-api.pcmarketweb.workers.dev"
).replace(/\/+$/, "");

const COPY: Record<Kind, { label: string; href: string }> = {
  prebuilds: { label: "Prebuilds", href: "/prebuilds" },
  laptops: { label: "Laptops", href: "/laptops" },
  consoles: { label: "Consoles", href: "/consoles" },
};

export default function ProductDetail({ kind }: { kind: Kind }) {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const { formatMoney } = useRegion();
  const { add, items } = useCart();
  const toast = useToast();
  const [product, setProduct] = useState<DetailProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE}/api/${kind}/${encodeURIComponent(id)}`);

        if (!response.ok) throw new Error("Product not found.");

        const payload = (await response.json()) as Record<string, unknown>;
        const raw =
          kind === "prebuilds"
            ? (payload.product as Record<string, unknown>)
            : ((payload.item as { data?: Record<string, unknown> })?.data ??
              (payload.item as Record<string, unknown>));

        if (!raw) throw new Error("Product not found.");

        if (!cancelled) {
          setProduct(normalize(raw, kind));
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message ?? "Could not load product.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [kind, id]);

  const inCart = useMemo(
    () => items.some((item) => item.productId === id),
    [items, id]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="h-8 w-48 animate-pulse rounded bg-[#dce3ee]" />
        <div className="mt-6 aspect-[4/3] max-w-2xl animate-pulse rounded-2xl bg-[#dce3ee]" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-[#2e3338]">Product not found</h1>
        <p className="mt-2 text-sm text-[#5c5e66]">
          {error || "This product may no longer be available."}
        </p>
        <Link
          href={COPY[kind].href}
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white hover:bg-[#4752C4]"
        >
          Back to {COPY[kind].label}
        </Link>
      </div>
    );
  }

  const cartItem = buildCartItem(product, kind);
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <main className="relative flex-1 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-12 lg:py-12">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm font-medium text-[#5c5e66]">
          <Link href="/" className="hover:text-[#5865F2]">Home</Link>
          <span aria-hidden="true" className="text-[#80848e]">/</span>
          <Link href={COPY[kind].href} className="hover:text-[#5865F2]">{COPY[kind].label}</Link>
          <span aria-hidden="true" className="text-[#80848e]">/</span>
          <span aria-current="page" className="text-[#2e3338]">{product.name}</span>
        </nav>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:gap-12">
          <div>
            <ProductGallery
              images={product.images}
              name={product.name}
              accent={product.brand === "amd" ? "#C8102E" : "#5865F2"}
            />
            <p className="mt-3 text-center text-xs text-[#80848e]">
              Tap any image for a full preview
            </p>
          </div>

          <div>
            {product.badge && (
              <span className="inline-flex rounded-full bg-[#5865F2]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#5865F2]">
                {product.badge}
              </span>
            )}

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#2e3338] sm:text-4xl">
              {product.name}
            </h1>

            {product.tagline && (
              <p className="mt-2 text-sm font-semibold text-[#5865F2]">{product.tagline}</p>
            )}

            {product.description && (
              <p className="mt-4 text-sm leading-relaxed text-[#5c5e66]">
                {product.description}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-extrabold text-[#2e3338]">
                {formatMoney(product.price)}
              </span>
              {product.originalPrice && (
                <>
                  <span className="text-lg text-[#80848e] line-through">
                    {formatMoney(product.originalPrice)}
                  </span>
                  {discount > 0 && (
                    <span className="rounded-full bg-[#DC2626]/10 px-2.5 py-1 text-xs font-bold text-[#B91C1C]">
                      Save {discount}%
                    </span>
                  )}
                </>
              )}
            </div>

            <p className={`mt-2 text-xs font-semibold ${product.stock === "in-stock" ? "text-[#15803D]" : "text-[#B45309]"}`}>
              {product.stock === "in-stock" ? "In stock — ready to ship" : "Built to order"}
            </p>

            <button
              type="button"
              onClick={() => {
                add(cartItem);
                toast.success(`${product.name} added to cart.`);
              }}
              disabled={inCart}
              className="mt-6 inline-flex h-13 w-full items-center justify-center rounded-xl bg-[#5865F2] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {inCart ? "In cart" : "Add to cart"}
            </button>

            {product.highlights.length > 0 && (
              <section className="mt-8">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]">
                  Highlights
                </h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {product.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-[#5c5e66]">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5865F2]" />
                      {h}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        {product.specs.length > 0 && (
          <section className="mt-12 rounded-2xl border border-[#dce3ee] bg-white p-6 shadow-card sm:p-8">
            <h2 className="text-xl font-bold text-[#2e3338]">Specifications</h2>
            <dl className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {product.specs.map((spec, index) => (
                <div key={`${spec.label}-${index}`} className="flex flex-wrap justify-between gap-2 border-b border-[#eef1f6] pb-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-[#80848e]">{spec.label}</dt>
                  <dd className="text-sm font-semibold text-[#2e3338]">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </main>
  );
}

function normalize(raw: Record<string, unknown>, kind: Kind): DetailProduct {
  const specs = Array.isArray(raw.specs)
    ? (raw.specs as { label?: unknown; value?: unknown }[])
        .map((s) => ({
          label: String(s.label ?? ""),
          value: String(s.value ?? ""),
        }))
        .filter((s) => s.label && s.value)
    : typeof raw.specs === "string" && raw.specs
      ? raw.specs.split(" · ").map((part) => {
          const i = part.indexOf(":");
          return i > 0
            ? { label: part.slice(0, i).trim(), value: part.slice(i + 1).trim() }
            : { label: "Details", value: part.trim() };
        })
      : [];

  const images = Array.isArray(raw.images)
    ? resolveImageUrls(raw.images as string[])
    : [];

  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? "Product"),
    description: String(raw.description ?? ""),
    tagline: raw.tagline ? String(raw.tagline) : undefined,
    price: Number(raw.price ?? 0),
    originalPrice: raw.originalPrice ? Number(raw.originalPrice) : undefined,
    images: images.length
      ? images
      : [resolveImageUrl(raw.image as string) ?? ""].filter(Boolean),
    specs,
    highlights: Array.isArray(raw.highlights)
      ? (raw.highlights as unknown[]).map(String)
      : [],
    stock: String(raw.stock ?? "in-stock"),
    badge: raw.badge ? String(raw.badge) : undefined,
    category: raw.category ? String(raw.category) : undefined,
    brand: raw.brand ? String(raw.brand) : undefined,
  };
}

function buildCartItem(product: DetailProduct, kind: Kind): CartItem {
  if (kind === "prebuilds") {
    return cartItemFromPrebuild({
      id: product.id,
      name: product.name,
      image: product.images[0] ?? "",
      images: product.images,
      brand: product.brand === "amd" ? "amd" : "intel",
      price: product.price,
      originalPrice: product.originalPrice ?? product.price,
      stock: product.stock === "in-stock" ? "in-stock" : "built-to-order",
      flagship: Boolean(product.badge),
      specs: product.specs.map((s) => `${s.label}: ${s.value}`).join(" · ") || product.description,
    });
  }

  if (kind === "laptops") {
    const category: LaptopCategory =
      laptopCategories.find((c) => c.id === product.category) ?? laptopCategories[0];

    return cartItemFromLaptop(
      {
        id: product.id,
        category: category.id,
        name: product.name,
        tagline: product.tagline ?? "",
        description: product.description,
        price: product.price,
        stock: product.stock === "in-stock" ? "in-stock" : "built-in-order",
        specs: product.specs,
        highlights: product.highlights,
        image: product.images[0],
        images: product.images,
      } as Laptop,
      category
    );
  }

  const category: ConsoleCategory =
    consoleCategories.find((c) => c.id === product.category) ?? consoleCategories[0];

  return cartItemFromConsole(
    {
      id: product.id,
      category: category.id,
      name: product.name,
      tagline: product.tagline ?? "",
      description: product.description,
      images: product.images,
      price: product.price,
      stock: product.stock === "in-stock" ? "in-stock" : "built-to-order",
      specs: product.specs,
      highlights: product.highlights,
    } as Console,
    category
  );
}
