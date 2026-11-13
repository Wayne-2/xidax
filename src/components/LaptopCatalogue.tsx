"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import LaptopArtwork from "@/components/LaptopArtwork";
import LaptopCard from "@/components/LaptopCard";
import { CartIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/AccessoryIcons";
import { CheckIcon } from "@/components/BuildIcons";
import {
  BriefcaseIcon,
  GamepadIcon,
  PaletteIcon,
} from "@/components/LaptopIcons";
import { useCart } from "@/components/CartProvider";
import { cartItemFromLaptop, type CartItem } from "@/data/cart";
import {
  formatLaptopPrice,
  type Laptop,
  type LaptopCategory,
  type LaptopCategoryId,
} from "@/data/laptops";

type LaptopCatalogueProps = {
  categories: LaptopCategory[];
  laptops: Laptop[];
  featured: Laptop;
};

type LaptopRowProps = {
  category: LaptopCategory;
  laptops: Laptop[];
  cartItems: CartItem[];
  onToggle: (laptop: Laptop) => void;
};

function CategoryIcon({
  category,
  className = "h-4 w-4",
}: {
  category: LaptopCategoryId;
  className?: string;
}) {
  switch (category) {
    case "gaming":
      return <GamepadIcon className={className} />;
    case "creator":
      return <PaletteIcon className={className} />;
    case "business":
      return <BriefcaseIcon className={className} />;
    default:
      return null;
  }
}

function LaptopRow({
  category,
  laptops,
  cartItems,
  onToggle,
}: LaptopRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;

    if (!track) return;

    setCanScrollLeft(track.scrollLeft > 4);
    setCanScrollRight(
      track.scrollLeft + track.clientWidth < track.scrollWidth - 4
    );
  }, []);

  useEffect(() => {
    const track = trackRef.current;

    if (!track) return;

    const handle = () => updateScrollState();
    const frame = requestAnimationFrame(handle);
    const observer = new ResizeObserver(handle);

    observer.observe(track);
    track
      .querySelectorAll<HTMLElement>("[data-laptop-track-item]")
      .forEach((item) => observer.observe(item));

    track.addEventListener("scroll", handle, { passive: true });
    window.addEventListener("resize", handle);
    window.addEventListener("load", handle);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      track.removeEventListener("scroll", handle);
      window.removeEventListener("resize", handle);
      window.removeEventListener("load", handle);
    };
  }, [updateScrollState, laptops.length]);

  function scrollRow(direction: -1 | 1) {
    const track = trackRef.current;

    if (!track) return;

    const card = track.querySelector<HTMLElement>("[data-laptop-track-item]");
    const amount = card ? card.offsetWidth + 20 : track.clientWidth * 0.8;

    track.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  return (
    <section
      id={category.id}
      aria-labelledby={`${category.id}-heading`}
      className="scroll-mt-32 border-b border-[#dce3ee] py-10 sm:py-14"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          data-reveal="up"
          className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="flex items-start gap-4">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d2dbe8]"
              style={{
                backgroundColor: `${category.accent}14`,
                color: category.accent,
              }}
            >
              <CategoryIcon category={category.id} className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#80848e]">
                {laptops.length} models
              </p>
              <h2
                id={`${category.id}-heading`}
                className="mt-1 text-2xl font-bold tracking-tight text-[#2e3338] sm:text-3xl"
              >
                {category.label}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#5c5e66]">
                {category.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:justify-end">
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                aria-label={`Scroll ${category.label} left`}
                disabled={!canScrollLeft}
                onClick={() => scrollRow(-1)}
                className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-[#d2dbe8] bg-[#f8fafe] text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Scroll ${category.label} right`}
                disabled={!canScrollRight}
                onClick={() => scrollRow(1)}
                className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-[#d2dbe8] bg-[#f8fafe] text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>

            <p className="hidden max-w-sm text-sm font-medium lg:block lg:text-right">
              <span style={{ color: category.accent }}>{category.tagline}</span>
            </p>
          </div>
        </div>

        <div className="relative mt-6">
          <div
            ref={trackRef}
            className="flex snap-x snap-mandatory items-start gap-5 overflow-x-auto pb-2 [scrollbar-width:none] lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-6 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden"
          >
            {laptops.map((laptop) => (
              <div
                key={laptop.id}
                data-laptop-track-item
                className="flex w-[88%] shrink-0 snap-start lg:w-auto"
              >
                <LaptopCard
                  laptop={laptop}
                  category={category}
                  added={cartItems.some(
                    (entry) => entry.productId === laptop.id
                  )}
                  onToggle={onToggle}
                />
              </div>
            ))}
          </div>

          {canScrollLeft && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#f0f4fa] to-transparent lg:hidden"
            />
          )}
          {canScrollRight && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#f0f4fa] to-transparent lg:hidden"
            />
          )}
        </div>
      </div>
    </section>
  );
}

export default function LaptopCatalogue({
  categories,
  laptops,
  featured,
}: LaptopCatalogueProps) {
  const { items: cartItems, add: addToCart, remove: removeFromCart } =
    useCart();
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null
  );
  const [featuredSpecsOpen, setFeaturedSpecsOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const featuredCategory =
    categories.find((category) => category.id === featured.category) ??
    categories[0];
  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const cartCount = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  function toggleLaptop(laptop: Laptop) {
    const category =
      categories.find((entry) => entry.id === laptop.category) ?? categories[0];
    const item = cartItemFromLaptop(laptop, category);
    const isAdded = cartItems.some(
      (entry) => entry.productId === laptop.id
    );

    if (isAdded) {
      removeFromCart(item.id);
    } else {
      addToCart(item);
    }

    setToast((current) => ({
      id: (current?.id ?? 0) + 1,
      message: isAdded
        ? `${laptop.name} removed from cart`
        : `${laptop.name} added to cart`,
    }));

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }

  return (
    <>
      <nav
        aria-label="Laptop categories"
        className="sticky top-16 z-40 border-y border-[#dce3ee] bg-[#f0f4fa]/90 backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-1 items-center gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="hidden shrink-0 pr-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#80848e] sm:block">
              Shop by use
            </span>
            {categories.map((category) => (
              <a
                key={category.id}
                href={`#${category.id}`}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#d2dbe8] bg-[#f8fafe] px-3.5 py-1.5 text-xs font-semibold text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338]"
              >
                <span style={{ color: category.accent }}>
                  <CategoryIcon category={category.id} className="h-3.5 w-3.5" />
                </span>
                {category.navLabel}
              </a>
            ))}
          </div>

          <span
            aria-live="polite"
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              cartCount > 0
                ? "border-[#5865F2] bg-[#5865F2] text-white"
                : "border-[#d2dbe8] bg-[#f8fafe] text-[#80848e]"
            }`}
          >
            <CartIcon className="h-3.5 w-3.5" />
            {cartCount} in cart
            {cartCount > 0 && (
              <span className="opacity-80">
                {" · "}
                {formatLaptopPrice(total)}
              </span>
            )}
          </span>
        </div>
      </nav>

      <section
        id="flagship"
        aria-labelledby="flagship-heading"
        className="border-b border-[#dce3ee] py-10 sm:py-14"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            data-reveal="up"
            className="overflow-hidden rounded-3xl border border-[#dce3ee] bg-[#eaf0f8]"
          >
            <div className="grid lg:grid-cols-[minmax(0,1fr)_440px]">
              <div
                className={`relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-[26rem] ${
                  featured.image ? "bg-[#f1f4f9]" : "bg-[#dce3ee]"
                }`}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-70"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
                    backgroundSize: "34px 34px",
                    maskImage:
                      "linear-gradient(to bottom right, black, transparent 80%)",
                    WebkitMaskImage:
                      "linear-gradient(to bottom right, black, transparent 80%)",
                  }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full blur-3xl"
                  style={{
                    backgroundColor: `${featuredCategory.accent}26`,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  {featured.image ? (
                    <Image
                      src={featured.image}
                      alt={featured.name}
                      fill
                      sizes="(min-width: 1024px) 50vw, 90vw"
                      className="object-contain p-3"
                    />
                  ) : (
                    <LaptopArtwork
                      category={featured.category}
                      accent={featuredCategory.accent}
                      label={`${featured.name} illustration`}
                    />
                  )}
                </div>
                <span className="absolute left-6 top-6 rounded-full bg-[#5865F2] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                  Flagship of the range
                </span>
              </div>

              <div className="flex flex-col p-6 sm:p-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#80848e]">
                  {featuredCategory.label}
                </p>
                <h2
                  id="flagship-heading"
                  className="mt-2 text-3xl font-bold tracking-tight text-[#2e3338] sm:text-4xl"
                >
                  {featured.name}
                </h2>
                <p
                  className="mt-2 text-sm font-semibold"
                  style={{ color: featuredCategory.accent }}
                >
                  {featured.tagline}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[#5c5e66]">
                  {featured.description}
                </p>

                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {featured.highlights.map((highlight, index) => (
                    <li
                      key={highlight}
                      className={`flex items-start gap-2 text-xs leading-relaxed text-[#5c5e66] ${
                        index > 1 ? "hidden sm:flex" : ""
                      }`}
                    >
                      <span
                        className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center"
                        style={{ color: featuredCategory.accent }}
                      >
                        <CheckIcon className="h-3 w-3" />
                      </span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>

                <dl
                  className={`mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-[#d2dbe8] bg-[#f8fafe] p-4 ${
                    featuredSpecsOpen ? "grid" : "hidden lg:grid"
                  }`}
                >
                  {featured.specs.map((spec) => (
                    <div key={spec.label} className="min-w-0">
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
                        {spec.label}
                      </dt>
                      <dd className="mt-0.5 truncate text-xs font-semibold text-[#2e3338]">
                        {spec.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <button
                  type="button"
                  onClick={() => setFeaturedSpecsOpen((open) => !open)}
                  aria-expanded={featuredSpecsOpen}
                  className="mt-3 inline-flex h-11 touch-manipulation items-center justify-center gap-1.5 rounded-lg border border-[#d2dbe8] bg-[#f8fafe] text-xs font-semibold text-[#5865F2] transition-colors hover:border-[#5865F2]/50 lg:hidden"
                >
                  {featuredSpecsOpen ? "Hide full specs" : "Show full specs"}
                  <ChevronRightIcon
                    className={`h-3.5 w-3.5 transition-transform duration-300 ${
                      featuredSpecsOpen ? "rotate-90" : ""
                    }`}
                  />
                </button>

                <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-6">
                  <div>
                    <span
                      className="text-3xl font-bold tracking-tight"
                      style={{ color: featuredCategory.accent }}
                    >
                      {formatLaptopPrice(featured.price)}
                    </span>
                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#80848e]">
                      Free shipping
                    </span>
                  </div>

                  <button
                    type="button"
                    aria-pressed={cartItems.some(
                      (entry) => entry.productId === featured.id
                    )}
                    aria-label={
                      cartItems.some(
                        (entry) => entry.productId === featured.id
                      )
                        ? `Remove ${featured.name} from cart`
                        : `Add ${featured.name} to cart`
                    }
                    onClick={() => toggleLaptop(featured)}
                    className={`inline-flex h-12 touch-manipulation items-center justify-center gap-2 rounded-lg px-7 text-sm font-semibold transition-colors ${
                      cartItems.some(
                        (entry) => entry.productId === featured.id
                      )
                        ? "border border-[#5865F2]/30 bg-[#5865F2]/10 text-[#4752C4] hover:bg-[#5865F2]/15"
                        : "bg-[#5865F2] text-white hover:bg-[#4752C4]"
                    }`}
                  >
                    {cartItems.some(
                      (entry) => entry.productId === featured.id
                    ) ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : (
                      <CartIcon className="h-4 w-4" />
                    )}
                    {cartItems.some(
                      (entry) => entry.productId === featured.id
                    )
                      ? "In cart"
                      : "Add to cart"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {categories.map((category) => (
        <LaptopRow
          key={category.id}
          category={category}
          laptops={laptops.filter((laptop) => laptop.category === category.id)}
          cartItems={cartItems}
          onToggle={toggleLaptop}
        />
      ))}

      {toast && (
        <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2">
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
