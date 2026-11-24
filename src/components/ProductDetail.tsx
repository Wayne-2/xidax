"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { useRegion } from "@/components/RegionProvider";
import { useToast } from "@/components/ToastProvider";
import ProductGallery from "@/components/ProductGallery";
import SpecTagIcon from "@/components/SpecTagIcon";
import { validateProductPromo } from "@/lib/api";
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
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; rate: number } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const endpoint = kind === "prebuilds" ? "products" : kind;
        const response = await fetch(
          `${API_BASE}/api/${endpoint}/${encodeURIComponent(id)}`
        );

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
  const promoKind: "prebuild" | "laptop" | "console" =
    kind === "prebuilds" ? "prebuild" : kind === "laptops" ? "laptop" : "console";
  const promoLineId = `${promoKind}-${product.id}`;
  const promoRate = appliedPromo?.rate ?? 0;
  const displayPrice = appliedPromo
    ? Math.round(product.price * (1 - promoRate) * 100) / 100
    : product.price;

  async function handleApplyPromo(event: React.FormEvent) {
    event.preventDefault();
    const code = promoInput.trim().toUpperCase();

    if (!code) return;

    setApplyingPromo(true);
    setPromoError("");

    try {
      const result = await validateProductPromo(code, promoLineId);

      if (!result.promo) {
        setAppliedPromo(null);
        setPromoError("That promo code is not valid for this product.");
        return;
      }

      setAppliedPromo({ code: result.promo.code, rate: result.promo.discount / 100 });
    } catch (err) {
      setAppliedPromo(null);
      setPromoError(
        (err as { message?: string }).message ?? "We could not apply that promo code."
      );
    } finally {
      setApplyingPromo(false);
    }
  }

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
                {formatMoney(displayPrice)}
              </span>
              {product.originalPrice && (
                <>
                  <span className="text-lg text-[#80848e] line-through">
                    {formatMoney(product.originalPrice)}
                  </span>
                  {(appliedPromo && appliedPromo.rate > 0) || discount > 0 ? (
                    <span className="rounded-full bg-[#DC2626]/10 px-2.5 py-1 text-xs font-bold text-[#B91C1C]">
                      {appliedPromo && appliedPromo.rate > 0
                        ? `Promo −${Math.round(appliedPromo.rate * 100)}%`
                        : `Save ${discount}%`}
                    </span>
                  ) : null}
                </>
              )}
            </div>

            <p className={`mt-2 text-xs font-semibold ${product.stock === "in-stock" ? "text-[#15803D]" : "text-[#B45309]"}`}>
              {product.stock === "in-stock" ? "In stock — ready to ship" : "Built to order"}
            </p>

            <button
              type="button"
              onClick={() => {
                add({
                  ...cartItem,
                  promoCode: appliedPromo?.code ?? cartItem.promoCode ?? null,
                  promoDiscount: appliedPromo
                    ? Math.round(cartItem.price * appliedPromo.rate)
                    : cartItem.promoDiscount,
                  promoEnabled: appliedPromo ? true : cartItem.promoEnabled,
                });
                toast.success(`${product.name} added to cart.`);
              }}
              disabled={inCart}
              className="mt-6 inline-flex h-13 w-full items-center justify-center rounded-xl bg-[#5865F2] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {inCart ? "In cart" : "Add to cart"}
            </button>

            <form onSubmit={handleApplyPromo} className="mt-6">
              <label
                htmlFor="product-promo"
                className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
              >
                Promo code
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="product-promo"
                  value={promoInput}
                  onChange={(event) => setPromoInput(event.target.value)}
                  placeholder="PCM-XXXXXX"
                  disabled={applyingPromo}
                  className="h-11 flex-1 rounded-xl border border-[#d2dbe8] bg-white px-3.5 text-sm text-[#2e3338] outline-none transition-colors placeholder:text-[#80848e] focus:border-[#5865F2]"
                />
                <button
                  type="submit"
                  disabled={applyingPromo || !promoInput.trim()}
                  className="inline-flex h-11 items-center rounded-xl bg-[#5865F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {applyingPromo ? "Applying…" : "Apply"}
                </button>
              </div>
              {promoError ? (
                <p className="mt-2 text-xs text-[#B91C1C]">{promoError}</p>
              ) : appliedPromo ? (
                <p className="mt-2 text-xs font-semibold text-[#15803D]">
                  Promo {appliedPromo.code} applied — saving{" "}
                  {Math.round(appliedPromo.rate * 100)}%.
                </p>
              ) : null}
            </form>

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
            <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {product.specs.map((spec, index) => (
                <div key={`${spec.label}-${index}`} className="border-b border-[#eef1f6] pb-3 text-left">
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">
                    <SpecTagIcon
                      label={spec.label}
                      className="h-3.5 w-3.5 shrink-0 text-[#5865F2]"
                    />
                    {spec.label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-[#2e3338]">
                    {spec.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {kind === "prebuilds" && (
          <section className="mt-12 rounded-2xl border border-[#dce3ee] bg-white p-6 shadow-card sm:p-8">
            <h2 className="text-xl font-bold text-[#2e3338]">
              How To Install Graphic Processor Unit (GPU/Graphics Card)
            </h2>
            <p className="mt-2 text-sm font-semibold text-[#5865F2]">
              Tools Required: Philips Head Screw Driver
            </p>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {installSteps.map((step) => (
                <div
                  key={step.image}
                  className="rounded-2xl border border-[#dce3ee] bg-[#f8fafe] p-5"
                >
                  <h3 className="text-sm font-bold text-[#2e3338]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5c5e66]">
                    {step.content}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={step.image}
                    alt={`${step.title} — installation step`}
                    className="mt-4 h-64 w-full rounded-xl border border-[#dce3ee] object-contain"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

const installSteps: {
  title: string;
  content: string;
  image: string;
}[] = [
  {
    title: "Open the side panel",
    content:
      "Make sure your pc is off and not plugged in. Then open the side panel.",
    image: "/pc_manuals/image-1.png",
  },
  {
    title: "Remove screws",
    content:
      "Remove the screws on the rear of the case that will be holding the graphics card in place. You may have to remove either the first, second, or third screw on the back, depending on your motherboard.",
    image: "/pc_manuals/image-2.png",
  },
  {
    title: "Prepare to slot the GPU",
    content:
      "Remove any existing graphics driver, then clear the PCI-e slot before seating the new card.",
    image: "/pc_manuals/image-3.png",
  },
  {
    title: "Insert the GPU in the PCI-e slot",
    content:
      "Align the gold connector on the graphics card with the PCI-e x16 slot and press firmly until seated.",
    image: "/pc_manuals/image-4.png",
  },
  {
    title: "Secure the Retention Bracket",
    content:
      "Secure the graphics card to the case retention bracket or mounting mechanism.",
    image: "/pc_manuals/image-5.png",
  },
  {
    title: "Connect cables to graphics card",
    content:
      "Connect the PCIe power cables from the power supply to the graphics card.",
    image: "/pc_manuals/image-6.png",
  },
  {
    title: "Reinstall side panels and continue pc setups",
    content:
      "Reinstall the side panels and resume the remaining PC setup steps.",
    image: "/pc_manuals/image-7.png",
  },
];

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
