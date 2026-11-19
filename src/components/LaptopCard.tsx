"use client";

import Link from "next/link";
import LaptopArtwork from "@/components/LaptopArtwork";
import ProductImageGrid from "@/components/ProductImageGrid";
import { CartIcon } from "@/components/ConsoleIcons";
import { CheckIcon } from "@/components/BuildIcons";
import ExpandableContent from "@/components/ExpandableContent";
import SpecList from "@/components/SpecList";
import { useRegion } from "@/components/RegionProvider";
import { type Laptop, type LaptopCategory } from "@/data/laptops";

type LaptopCardProps = {
  laptop: Laptop;
  category: LaptopCategory;
  added: boolean;
  onToggle: (laptop: Laptop) => void;
};

export default function LaptopCard({
  laptop,
  category,
  added,
  onToggle,
}: LaptopCardProps) {
  const { formatMoney } = useRegion();
  const accent = category.accent;
  const inStock = laptop.stock === "in-stock";
  return (
    <article
      data-laptop-card
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] shadow-card transition-colors hover:border-[#5865F2]/60 hover:shadow-card-hover"
    >
      <div
        className={`relative aspect-[16/10] shrink-0 overflow-hidden ${
          laptop.image ? "bg-[#f1f4f9]" : "bg-[#dce3ee]"
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "linear-gradient(to bottom right, black, transparent 78%)",
            WebkitMaskImage:
              "linear-gradient(to bottom right, black, transparent 78%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full blur-3xl"
          style={{ backgroundColor: `${accent}22` }}
        />

        <ProductImageGrid
          images={laptop.images?.length ? laptop.images : laptop.image ? [laptop.image] : []}
          alt={laptop.name}
          fallback={
            <LaptopArtwork
              category={category.id}
              accent={accent}
              label={`${laptop.name} illustration`}
            />
          }
        />

        <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
          <span className="rounded-full border border-[#d2dbe8]/80 bg-[#f8fafe]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#5c5e66] backdrop-blur">
            {category.label}
          </span>
          {laptop.badge && (
            <span
              className="animate-badge-pulse rounded-full bg-[#f8fafe]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur"
              style={{ color: accent }}
            >
              {laptop.badge}
            </span>
          )}
        </div>

        <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-[#f8fafe]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              inStock ? "bg-[#16A34A]" : "bg-[#B45309]"
            }`}
          />
          <span className={inStock ? "text-[#15803D]" : "text-[#B45309]"}>
            {inStock ? "In stock" : "Built in order"}
          </span>
        </span>
      </div>

      <ExpandableContent collapsedHeight={260} label="details">
        <div className="flex flex-col p-6 pb-0">
        <Link href={`/laptops/${laptop.id}`} className="block text-xl font-bold tracking-tight text-[#2e3338] transition-colors hover:text-[#5865F2]">
          {laptop.name}
        </Link>
        <p className="mt-1 text-sm font-medium" style={{ color: accent }}>
          {laptop.tagline}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#5c5e66]">
          {laptop.description}
        </p>

        <SpecList items={laptop.highlights} columns className="mt-4" />

        <SpecList
          items={laptop.specs.map((spec) => `${spec.label}: ${spec.value}`)}
          columns
          className="mt-5 rounded-xl border border-[#d2dbe8] bg-[#f8fafe] p-4"
        />

        </div>
      </ExpandableContent>

      <div className="shrink-0 px-6 pb-2">
        <Link
          href={`/laptops/${laptop.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#5865F2] hover:text-[#4752C4]"
        >
          View details →
        </Link>
      </div>

      <div className="shrink-0 p-6 pt-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span
              className="text-2xl font-bold tracking-tight"
              style={{ color: accent }}
            >
              {formatMoney(laptop.price)}
            </span>
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#80848e]">
              Free shipping
            </span>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <button
              type="button"
              aria-pressed={added}
              aria-label={
                added
                  ? `Remove ${laptop.name} from cart`
                  : `Add ${laptop.name} to cart`
              }
              onClick={() => onToggle(laptop)}
              className={`inline-flex h-11 flex-1 touch-manipulation items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors sm:flex-none ${
                added
                  ? "border border-[#5865F2]/30 bg-[#5865F2]/10 text-[#4752C4] hover:bg-[#5865F2]/15"
                  : "bg-[#5865F2] text-white hover:bg-[#4752C4]"
              }`}
            >
              {added ? (
                <CheckIcon className="h-4 w-4" />
              ) : (
                <CartIcon className="h-4 w-4" />
              )}
              {added ? "In cart" : "Add to cart"}
            </button>

          </div>
        </div>
      </div>
    </article>
  );
}
