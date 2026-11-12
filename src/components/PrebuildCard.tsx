import Image from "next/image";
import { SlidersIcon } from "@/components/AccessoryIcons";
import type { Prebuild } from "@/data/prebuilds";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function PrebuildCard({ product }: { product: Prebuild }) {
  const inStock = product.stock === "in-stock";
  const discount = Math.round(
    (1 - product.price / product.originalPrice) * 100
  );

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] transition-colors hover:border-[#5865F2]/60">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#dce3ee]">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
          quality={90}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />

        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span
            className={`animate-badge-pulse text-[10px] font-bold uppercase tracking-wide ${
              product.brand === "intel" ? "text-[#0068B5]" : "text-[#C8102E]"
            }`}
          >
            {product.brand === "intel" ? "Intel" : "AMD"}
          </span>
          <span
            className={`animate-badge-pulse text-[10px] font-bold uppercase tracking-wide ${
              inStock ? "text-[#15803D]" : "text-[#B45309]"
            }`}
          >
            {inStock ? "In stock" : "Built in order"}
          </span>
        </div>

        {product.flagship && (
          <span className="absolute bottom-3 left-3 animate-badge-pulse text-[10px] font-bold uppercase tracking-wide text-[#5865F2]">
            Flagship
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-base font-semibold leading-snug text-[#2e3338]">
          {product.name}
        </h3>

        <p className="text-sm leading-relaxed text-[#5c5e66]">
          {product.specs}
        </p>

        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xl font-bold text-[#5865F2]">
              {priceFormatter.format(product.price)}
            </span>
            <span className="text-sm text-[#80848e] line-through">
              {priceFormatter.format(product.originalPrice)}
            </span>
            <span className="rounded-full bg-[#DC2626]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#B91C1C]">
              Save {discount}%
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 sm:hidden">
          <button
            type="button"
            aria-label={`Add ${product.name} to cart`}
            className="inline-flex h-11 flex-1 items-center justify-center whitespace-nowrap rounded-lg bg-[#5865F2] text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
          >
            Add to Cart
          </button>
          <button
            type="button"
            aria-label={`Customize ${product.name}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#d2dbe8] text-[#4e5058] transition-colors hover:border-[#b8c4d6] hover:text-[#2e3338]"
          >
            <SlidersIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 hidden flex-col gap-2 sm:flex">
          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-lg bg-[#5865F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
          >
            Add to Cart
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-lg border border-[#d2dbe8] px-4 text-sm font-medium text-[#4e5058] transition-colors hover:border-[#b8c4d6] hover:text-[#2e3338]"
          >
            Customize Build
          </button>
        </div>
      </div>
    </article>
  );
}
