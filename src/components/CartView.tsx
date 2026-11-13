"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import AccessoryArtwork from "@/components/AccessoryArtwork";
import { CartIcon } from "@/components/AccessoryIcons";
import { ArrowIcon, CheckIcon } from "@/components/BuildIcons";
import { useCart } from "@/components/CartProvider";
import LaptopArtwork from "@/components/LaptopArtwork";
import {
  cartItemFromAccessory,
  cartItemFromLaptop,
  cartPromoCodes,
  flatShippingRate,
  freeShippingThreshold,
  type CartItem,
} from "@/data/cart";
import { accessories, accessoryCategories } from "@/data/accessories";
import { laptops, laptopCategories } from "@/data/laptops";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
    </svg>
  );
}

function ChevronIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ItemThumbnail({ item }: { item: CartItem }) {
  if (item.image) {
    return (
      <Image
        src={item.image}
        alt={item.name}
        fill
        sizes="112px"
        className="object-cover"
      />
    );
  }

  if (item.kind === "laptop") {
    return (
      <LaptopArtwork
        category={item.artCategory as "gaming" | "creator" | "business"}
        accent={item.accent}
        label={`${item.name} illustration`}
      />
    );
  }

  return (
    <AccessoryArtwork
      category={item.artCategory as "monitors" | "mice" | "keyboards"}
      accent={item.accent}
      label={`${item.name} illustration`}
    />
  );
}

export default function CartView() {
  const { items, count, subtotal, ready, add, remove, setQuantity, clear } =
    useCart();
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; rate: number } | null>(
    null
  );
  const [promoError, setPromoError] = useState("");

  const discount = promo ? Math.round(subtotal * promo.rate) : 0;
  const discounted = subtotal - discount;
  const shipping =
    items.length === 0 || discounted >= freeShippingThreshold
      ? 0
      : flatShippingRate;
  const total = discounted + shipping;
  const awayFromFree = Math.max(0, freeShippingThreshold - discounted);
  const freeShippingProgress = Math.min(
    100,
    Math.round((discounted / freeShippingThreshold) * 100)
  );

  const suggestions = [
    ...laptops.slice(0, 2).map((laptop) => ({
      item: cartItemFromLaptop(
        laptop,
        laptopCategories.find((c) => c.id === laptop.category) ??
          laptopCategories[0]
      ),
    })),
    ...accessories.slice(0, 2).map((accessory) => ({
      item: cartItemFromAccessory(
        accessory,
        accessoryCategories.find((c) => c.id === accessory.category) ??
          accessoryCategories[0]
      ),
    })),
  ].filter(
    (entry) => !items.some((item) => item.id === entry.item.id)
  );

  function applyPromo() {
    const code = promoInput.trim().toUpperCase();

    if (!code) {
      setPromoError("Enter a promo code.");
      return;
    }

    const rate = cartPromoCodes[code];

    if (!rate) {
      setPromo(null);
      setPromoError("That code is not valid.");
      return;
    }

    setPromo({ code, rate });
    setPromoError("");
    setPromoInput("");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-sm font-medium text-[#5c5e66]"
      >
        <Link href="/" className="transition-colors hover:text-[#5865F2]">
          Home
        </Link>
        <span aria-hidden="true" className="text-[#80848e]">
          /
        </span>
        <span className="text-[#2e3338]">Cart</span>
      </nav>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5865F2]">
            Your basket
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#2e3338] sm:text-5xl">
            CART
          </h1>
        </div>
        {count > 0 && (
          <p className="text-sm font-medium text-[#5c5e66]">
            {count} {count === 1 ? "item" : "items"} · {money.format(subtotal)}
          </p>
        )}
      </div>

      {!ready ? (
        <div className="mt-8 h-40 animate-pulse rounded-2xl bg-[#eaf0f8]" />
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[#d2dbe8] bg-[#eaf0f8] px-6 py-16 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d2dbe8] bg-[#f8fafe] text-[#80848e]">
            <CartIcon className="h-8 w-8" />
          </span>
          <h2 className="mt-6 text-xl font-bold tracking-tight text-[#2e3338]">
            Your cart is empty
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#5c5e66]">
            Pick a prebuild, configure a machine or add the accessories that
            finish the setup.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/prebuilds"
              className="inline-flex h-11 touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
            >
              Shop prebuilds
              <ArrowIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/laptops"
              className="inline-flex h-11 touch-manipulation items-center justify-center rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-5 text-sm font-semibold text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338]"
            >
              Browse laptops
            </Link>
            <Link
              href="/accessories"
              className="inline-flex h-11 touch-manipulation items-center justify-center rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-5 text-sm font-semibold text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338]"
            >
              Accessories
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="min-w-0 space-y-4">
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-4 sm:p-5"
                >
                  <div className="flex gap-4">
                    <div
                      className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#d2dbe8] bg-[#dce3ee] p-2 sm:h-28 sm:w-28"
                    >
                      <ItemThumbnail item={item} />
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#80848e]">
                            {item.category}
                          </p>
                          <Link
                            href={item.href}
                            className="mt-1 block truncate text-base font-bold tracking-tight text-[#2e3338] transition-colors hover:text-[#5865F2]"
                          >
                            {item.name}
                          </Link>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#5c5e66]">
                            {item.meta}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => remove(item.id)}
                          aria-label={`Remove ${item.name} from cart`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#80848e] transition-colors hover:bg-[#DC2626]/10 hover:text-[#B91C1C]"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center rounded-lg border border-[#d2dbe8] bg-[#f8fafe]">
                            <button
                              type="button"
                              onClick={() =>
                                setQuantity(item.id, item.quantity - 1)
                              }
                              aria-label={`Decrease quantity of ${item.name}`}
                              className="flex h-9 w-9 items-center justify-center text-[#5c5e66] transition-colors hover:text-[#2e3338]"
                            >
                              <span aria-hidden="true">−</span>
                            </button>
                            <span className="w-8 text-center text-sm font-semibold text-[#2e3338]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setQuantity(item.id, item.quantity + 1)
                              }
                              aria-label={`Increase quantity of ${item.name}`}
                              className="flex h-9 w-9 items-center justify-center text-[#5c5e66] transition-colors hover:text-[#2e3338]"
                            >
                              <span aria-hidden="true">+</span>
                            </button>
                          </div>

                          <span className="text-xs text-[#80848e]">
                            {money.format(item.price)} each
                          </span>
                        </div>

                        <span className="text-lg font-bold tracking-tight text-[#2e3338]">
                          {money.format(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d2dbe8] bg-[#eaf0f8] px-4 py-3">
              <button
                type="button"
                onClick={clear}
                className="text-xs font-semibold text-[#5c5e66] transition-colors hover:text-[#B91C1C]"
              >
                Empty cart
              </button>
              <Link
                href="/prebuilds"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5865F2] transition-colors hover:text-[#4752C4]"
              >
                Continue shopping
                <ArrowIcon className="h-3.5 w-3.5" />
              </Link>
            </div>

            {suggestions.length > 0 && (
              <section className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-4 sm:p-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2e3338]">
                  Complete your setup
                </h2>

                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {suggestions.map(({ item }) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-[#dce3ee] bg-[#f8fafe] p-3"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#d2dbe8] bg-[#dce3ee] p-1.5">
                        <ItemThumbnail item={item} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#2e3338]">
                          {item.name}
                        </p>
                        <p className="truncate text-xs text-[#5c5e66]">
                          {item.category} · {money.format(item.price)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => add(item)}
                        aria-label={`Add ${item.name} to cart`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#5865F2] text-white transition-colors hover:bg-[#4752C4]"
                      >
                        <span aria-hidden="true" className="text-lg leading-none">
                          +
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="min-w-0 rounded-2xl border border-[#5865F2]/25 bg-[#eaf0f8] p-5 sm:p-6 lg:sticky lg:top-24">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2e3338]">
              Order summary
            </h2>

            {awayFromFree > 0 && (
              <div className="mt-4 rounded-xl border border-[#d2dbe8] bg-[#f8fafe] p-3">
                <p className="text-xs leading-relaxed text-[#5c5e66]">
                  Add{" "}
                  <span className="font-semibold text-[#2e3338]">
                    {money.format(awayFromFree)}
                  </span>{" "}
                  more for free shipping.
                </p>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#dce3ee]"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={freeShippingThreshold}
                  aria-valuenow={discounted}
                  aria-label="Progress to free shipping"
                >
                  <div
                    className="h-full rounded-full bg-[#5865F2] transition-[width] duration-300"
                    style={{ width: `${freeShippingProgress}%` }}
                  />
                </div>
              </div>
            )}

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#5c5e66]">Subtotal</dt>
                <dd className="font-semibold text-[#2e3338]">
                  {money.format(subtotal)}
                </dd>
              </div>

              {promo && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-[#15803D]">
                    <CheckIcon className="h-3.5 w-3.5" />
                    {promo.code}
                  </dt>
                  <dd className="font-semibold text-[#15803D]">
                    −{money.format(discount)}
                  </dd>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#5c5e66]">Shipping</dt>
                <dd className="font-semibold text-[#2e3338]">
                  {shipping === 0 ? "Free" : money.format(shipping)}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-[#d2dbe8] pt-3">
                <dt className="text-base font-bold text-[#2e3338]">Total</dt>
                <dd className="text-xl font-bold tracking-tight text-[#2e3338]">
                  {money.format(total)}
                </dd>
              </div>
            </dl>

            <div className="mt-5">
              <label
                htmlFor="promo"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
              >
                Promo code
              </label>
              <div className="flex gap-2">
                <input
                  id="promo"
                  value={promoInput}
                  onChange={(event) => setPromoInput(event.target.value)}
                  placeholder="PCM10"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-3.5 text-sm uppercase text-[#2e3338] outline-none transition-colors placeholder:text-[#80848e] focus:border-[#5865F2]"
                />
                <button
                  type="button"
                  onClick={applyPromo}
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-4 text-sm font-semibold text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338]"
                >
                  Apply
                </button>
              </div>
              {promoError && (
                <p className="mt-1.5 text-xs text-[#B91C1C]">{promoError}</p>
              )}
            </div>

            <Link
              href="/checkout"
              className="mt-5 inline-flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#5865F2] text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
            >
              Checkout · {money.format(total)}
              <ArrowIcon className="h-4 w-4" />
            </Link>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-[#80848e]">
              Taxes calculated at checkout. 3-year warranty and lifetime
              labour coverage included.
            </p>

            <details className="mt-4 group rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-3.5 py-2.5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-[#5c5e66]">
                Shipping &amp; returns
                <ChevronIcon className="h-4 w-4 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-[#5c5e66]">
                Free tracked shipping over {money.format(freeShippingThreshold)}.
                Prebuilt machines leave the workshop in 1–3 business days, and
                every order can be returned within 30 days.
              </p>
            </details>
          </aside>
        </div>
      )}
    </div>
  );
}
