"use client";

import { useEffect, useRef, useState } from "react";
import ConsoleRail from "@/components/ConsoleRail";
import {
  ConsoleCategoryIcon,
  CartIcon,
} from "@/components/ConsoleIcons";
import { CheckIcon } from "@/components/BuildIcons";
import { useCart } from "@/components/CartProvider";
import { cartItemFromConsole } from "@/data/cart";
import type { Console, ConsoleCategory } from "@/data/consoles";
import ProductImageGrid from "@/components/ProductImageGrid";
import ConsoleArtwork from "@/components/ConsoleArtwork";
import { useRegion } from "@/components/RegionProvider";

type ConsolesCatalogueProps = {
  categories: ConsoleCategory[];
  products: Console[];
  featured: Console;
};

type Toast = {
  id: number;
  message: string;
};

export default function ConsolesCatalogue({
  categories,
  products,
  featured,
}: ConsolesCatalogueProps) {
  const { items: cartItems, add: addToCart, remove: removeFromCart } =
    useCart();
  const { formatMoney } = useRegion();
  const featuredCategory =
    categories.find((entry) => entry.id === featured.category) ?? categories[0];
  const featuredInCart = cartItems.some(
    (entry) => entry.productId === featured.id
  );
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cartCount = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  function toggleProduct(product: Console) {
    const category =
      categories.find((entry) => entry.id === product.category) ??
      categories[0];
    const item = cartItemFromConsole(product, category);
    const isAdded = cartItems.some(
      (entry) => entry.productId === product.id
    );

    if (isAdded) {
      removeFromCart(item.id);
    } else {
      addToCart(item);
    }

    setToast((current) => ({
      id: (current?.id ?? 0) + 1,
      message: isAdded
        ? `${product.name} removed from cart`
        : `${product.name} added to cart`,
    }));

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }

  return (
    <>
      <section id="flagship" className="border-b border-[#dce3ee] bg-[#eaf0f8]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8 lg:py-16">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#dce3ee] bg-[#f1f4f9]">
            <ProductImageGrid
              images={featured.images ?? []}
              alt={featured.name}
              fallback={
                <ConsoleArtwork
                  category={featured.category}
                  accent={featuredCategory?.accent ?? "#5865F2"}
                  label={`${featured.name} illustration`}
                />
              }
            />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5865F2]">
              Featured display
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#2e3338] sm:text-4xl">
              {featured.name}
            </h2>
            <p className="mt-2 text-sm font-semibold text-[#5865F2]">{featured.tagline}</p>
            <p className="mt-4 text-sm leading-relaxed text-[#5c5e66]">{featured.description}</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {featured.highlights.map((h) => (
                <div key={h} className="flex items-start gap-2 text-sm text-[#5c5e66]">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" />
                  <span>{h}</span>
                </div>
              ))}
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-2">
              {featured.specs.map((spec) => (
                <div key={spec.label} className="flex justify-between border-b border-[#d2dbe8] pb-1 text-xs">
                  <dt className="text-[#80848e]">{spec.label}</dt>
                  <dd className="font-semibold text-[#2e3338]">{spec.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex items-center justify-between gap-4">
              <div>
                <p className="text-2xl font-bold text-[#5865F2]">{formatMoney(featured.price)}</p>
                {featured.originalPrice && (
                  <p className="text-sm text-[#80848e] line-through">{formatMoney(featured.originalPrice)}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => toggleProduct(featured)}
                className={`inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-semibold transition-colors ${
                  featuredInCart
                    ? "border border-[#5865F2]/30 bg-[#5865F2]/10 text-[#4752C4]"
                    : "bg-[#5865F2] text-white hover:bg-[#4752C4]"
                }`}
              >
                <CartIcon className="h-4 w-4" />
                {featuredInCart ? "In cart" : "Add to cart"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <nav
        aria-label="Console categories"
        className="sticky top-16 z-40 border-y border-[#dce3ee] bg-[#f0f4fa]/90 backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 pr-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#80848e]">
            Shop by category
          </span>
          {categories.map((category) => (
            <a
              key={category.id}
              href={`#${category.id}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#d2dbe8] bg-[#f8fafe] px-3 py-1.5 text-xs font-semibold text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338]"
            >
              <ConsoleCategoryIcon
                category={category.id}
                className="h-3.5 w-3.5"
              />
              {category.navLabel}
            </a>
          ))}
          <span
            aria-live="polite"
            className={`ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              cartCount > 0
                ? "border-[#5865F2] bg-[#5865F2] text-white"
                : "border-[#d2dbe8] bg-[#f8fafe] text-[#80848e]"
            }`}
          >
            <CartIcon className="h-3.5 w-3.5" />
            {cartCount} in cart
          </span>
        </div>
      </nav>

      <div className="bg-[#f0f4fa]">
        {categories.map((category) => (
          <ConsoleRail
            key={category.id}
            category={category}
            products={products.filter(
              (product) => product.category === category.id,
            )}
            cartItems={cartItems}
            onToggle={toggleProduct}
          />
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className="animate-toast-in flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-[#d2dbe8] bg-[#2e3338] px-4 py-2.5 text-sm font-medium text-white shadow-xl"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5865F2]">
              <CheckIcon className="h-3 w-3" />
            </span>
            <span className="min-w-0 truncate">{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
}
