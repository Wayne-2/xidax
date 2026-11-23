import Link from "next/link";
import { SlidersIcon } from "@/components/ConsoleIcons";
import ExpandableContent from "@/components/ExpandableContent";
import SpecList from "@/components/SpecList";
import { useCart } from "@/components/CartProvider";
import { useRegion } from "@/components/RegionProvider";
import { cartItemFromPrebuild } from "@/data/cart";
import type { Prebuild } from "@/data/prebuilds";

export default function PrebuildCard({ product }: { product: Prebuild }) {
  const { formatMoney } = useRegion();
  const { items, add, remove } = useCart();
  const inCart = items.some((entry) => entry.productId === product.id);

  function toggleCart() {
    const item = cartItemFromPrebuild(product);

    if (inCart) {
      remove(item.id);
    } else {
      add(item);
    }
  }
  const discount = Math.round(
    (1 - product.price / product.originalPrice) * 100
  );

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] shadow-card transition-colors hover:border-[#5865F2]/60 hover:shadow-card-hover">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#dce3ee]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.images?.[0] || product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
        />

        {product.flagship && (
          <span className="absolute bottom-3 left-3 z-10 animate-badge-pulse text-[10px] font-bold uppercase tracking-wide text-[#5865F2]">
            Flagship
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <ExpandableContent collapsedHeight={150} label="details">
          <div className="space-y-3">
            <Link
              href={`/prebuilds/${product.id}`}
              className="block text-base font-semibold leading-snug text-[#2e3338] transition-colors hover:text-[#5865F2]"
            >
              {product.name}
            </Link>
            <SpecList
              items={product.specs.split(" · ")}
              className="pt-1"
            />
          </div>
        </ExpandableContent>

        <div className="mt-auto pt-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xl font-bold text-[#5865F2]">
              {formatMoney(product.price)}
            </span>
            <span className="text-sm text-[#80848e] line-through">
              {formatMoney(product.originalPrice)}
            </span>
            <span className="rounded-full bg-[#DC2626]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#B91C1C]">
              Save {discount}%
            </span>
          </div>
        </div>

        <Link
          href={`/prebuilds/${product.id}`}
          className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#5865F2] hover:text-[#4752C4]"
        >
          View details →
        </Link>

        <div className="mt-3 flex items-center gap-2 sm:hidden">
          <button
            type="button"
            aria-pressed={inCart}
            aria-label={
              inCart
                ? `Remove ${product.name} from cart`
                : `Add ${product.name} to cart`
            }
            onClick={toggleCart}
            className={`inline-flex h-11 flex-1 items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-colors ${
              inCart
                ? "border border-[#5865F2]/30 bg-[#5865F2]/10 text-[#4752C4] hover:bg-[#5865F2]/15"
                : "bg-[#5865F2] text-white hover:bg-[#4752C4]"
            }`}
          >
            {inCart ? "In cart" : "Add to Cart"}
          </button>
          <button
            type="button"
            aria-label={`Customize ${product.name}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#d2dbe8] text-[#5c5e66] transition-colors hover:border-[#b8c4d6] hover:text-[#2e3338]"
          >
            <SlidersIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 hidden flex-col gap-2 sm:flex">
          <button
            type="button"
            aria-pressed={inCart}
            onClick={toggleCart}
            className={`inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition-colors ${
              inCart
                ? "border border-[#5865F2]/30 bg-[#5865F2]/10 text-[#4752C4] hover:bg-[#5865F2]/15"
                : "bg-[#5865F2] text-white hover:bg-[#4752C4]"
            }`}
          >
            {inCart ? "In cart" : "Add to Cart"}
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-lg border border-[#d2dbe8] px-4 text-sm font-medium text-[#5c5e66] transition-colors hover:border-[#b8c4d6] hover:text-[#2e3338]"
          >
            Customize Build
          </button>
        </div>
      </div>
    </article>
  );
}
