"use client";

import Link from "next/link";
import { useRegion } from "@/components/RegionProvider";
import { useCart } from "@/components/CartProvider";
import { cartItemFromConsole } from "@/data/cart";
import { type Console, type ConsoleCategory } from "@/data/consoles";
import ConsoleArtwork from "@/components/ConsoleArtwork";
import ProductImageGrid from "@/components/ProductImageGrid";
import { CartIcon } from "@/components/ConsoleIcons";
import { CheckIcon } from "@/components/BuildIcons";
import ExpandableContent from "@/components/ExpandableContent";

type ConsoleCardProps = {
  consoleItem: Console;
  category: ConsoleCategory;
  added: boolean;
  onToggle: (consoleItem: Console) => void;
};

export default function ConsoleCard({
  consoleItem,
  category,
  added,
  onToggle,
}: ConsoleCardProps) {
  const { formatMoney } = useRegion();
  const { items } = useCart();
  const accent = category.accent;
  const inStock = consoleItem.stock === "in-stock";
  const discount = consoleItem.originalPrice
    ? Math.round((1 - consoleItem.price / consoleItem.originalPrice) * 100)
    : 0;

  return (
    <article
      data-console-card
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] shadow-card transition-colors hover:border-[#5865F2]/60"
    >
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-[#dce3ee]">
        <ProductImageGrid
          images={consoleItem.images ?? []}
          alt={consoleItem.name}
          fallback={
            <ConsoleArtwork
              category={category.id}
              accent={accent}
              label={`${consoleItem.name} illustration`}
            />
          }
        />

        <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
          <span className="rounded-full border border-[#d2dbe8]/80 bg-[#f8fafe]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#5c5e66] backdrop-blur">
            {category.navLabel}
          </span>
          {consoleItem.badge && (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white"
              style={{ backgroundColor: consoleItem.badge === "Sale" ? "#B91C1C" : accent }}
            >
              {consoleItem.badge}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <ExpandableContent collapsedHeight={230} label="specs">
          <div className="space-y-2">
          <Link href={`/consoles/${consoleItem.id}`} className="block text-base font-semibold leading-snug text-[#2e3338] transition-colors hover:text-[#5865F2]">
              {consoleItem.name}
            </Link>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5865F2]">
            {consoleItem.tagline}
          </p>
          <p className="text-sm leading-relaxed text-[#5c5e66]">
            {consoleItem.description}
          </p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
            {consoleItem.highlights.map((highlight) => (
              <div key={highlight} className="flex items-start gap-1.5 text-xs text-[#5c5e66]">
                <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16A34A]" />
                <span>{highlight}</span>
              </div>
            ))}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 text-xs">
            {consoleItem.specs.map((spec) => (
              <div key={spec.label} className="flex justify-between gap-2 border-b border-[#dce3ee] pb-1">
                <dt className="text-[#80848e]">{spec.label}</dt>
                <dd className="text-right font-medium text-[#2e3338]">{spec.value}</dd>
              </div>
            ))}
          </dl>

          </div>
        </ExpandableContent>

        <Link
          href={`/consoles/${consoleItem.id}`}
          className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#5865F2] hover:text-[#4752C4]"
        >
          View details →
        </Link>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-xl font-bold text-[#5865F2]">
                {formatMoney(consoleItem.price)}
              </span>
              {consoleItem.originalPrice && (
                <>
                  <span className="text-sm text-[#80848e] line-through">
                    {formatMoney(consoleItem.originalPrice)}
                  </span>
                  {discount > 0 && (
                    <span className="rounded-full bg-[#DC2626]/10 px-2 py-0.5 text-[10px] font-bold text-[#B91C1C]">
                      Save {discount}%
                    </span>
                  )}
                </>
              )}
            </div>
            <span className={`text-[11px] font-semibold ${inStock ? "text-[#15803D]" : "text-[#B45309]"}`}>
              {inStock ? "In stock" : "Built to order"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onToggle(consoleItem)}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors ${
              added
                ? "border border-[#5865F2]/30 bg-[#5865F2]/10 text-[#4752C4]"
                : "bg-[#5865F2] text-white hover:bg-[#4752C4]"
            }`}
          >
            {added ? <CheckIcon className="h-4 w-4" /> : <CartIcon className="h-4 w-4" />}
            {added ? "Added" : "Add"}
          </button>
        </div>
      </div>
    </article>
  );
}
