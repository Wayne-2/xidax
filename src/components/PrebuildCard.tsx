import Image from "next/image";
import { CartIcon, SlidersIcon } from "@/components/AccessoryIcons";
import type { Prebuild } from "@/data/prebuilds";

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function PrebuildCard({ product }: { product: Prebuild }) {
  const inStock = product.stock === "in-stock";

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

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <span className="text-lg font-bold text-[#5865F2]">
            {priceFormatter.format(product.price)}
          </span>

          <div className="flex items-center gap-2 sm:hidden">
            <button
              type="button"
              aria-label={`Add ${product.name} to cart`}
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#5865F2] text-white transition-colors hover:bg-[#4752C4]"
            >
              <CartIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label={`Customize ${product.name}`}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#d2dbe8] text-[#4e5058] transition-colors hover:border-[#b8c4d6] hover:text-[#2e3338]"
            >
              <SlidersIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-1 hidden flex-col gap-2 sm:flex">
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
