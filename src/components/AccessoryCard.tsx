import AccessoryArtwork from "@/components/AccessoryArtwork";
import { CartIcon } from "@/components/AccessoryIcons";
import { CheckIcon } from "@/components/BuildIcons";
import {
  formatAccessoryPrice,
  type Accessory,
  type AccessoryCategory,
} from "@/data/accessories";

type AccessoryCardProps = {
  category: AccessoryCategory;
  product: Accessory;
  added: boolean;
  onToggle: (product: Accessory) => void;
};

export default function AccessoryCard({
  category,
  product,
  added,
  onToggle,
}: AccessoryCardProps) {
  const accent = category.accent;
  const badgeColor = product.badge === "Sale" ? "#B91C1C" : accent;

  return (
    <article
      data-accessory-card
      className="group flex h-full w-[82%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] transition-colors hover:border-[#5865F2]/60 sm:w-[47%] lg:w-[31.5%] xl:w-[24%]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#dce3ee]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "linear-gradient(to bottom right, black, transparent 75%)",
            WebkitMaskImage:
              "linear-gradient(to bottom right, black, transparent 75%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl"
          style={{ backgroundColor: `${accent}22` }}
        />

        <div className="absolute inset-0 flex items-center justify-center p-5">
          <AccessoryArtwork
            category={category.id}
            accent={accent}
            label={`${product.name} illustration`}
          />
        </div>

        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span className="rounded-full border border-[#d2dbe8]/80 bg-[#f8fafe]/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#5c5e66] backdrop-blur">
            {category.label}
          </span>
          {product.badge && (
            <span
              className="animate-badge-pulse rounded-full bg-[#f8fafe]/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] backdrop-blur"
              style={{ color: badgeColor }}
            >
              {product.badge}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#80848e]">
            {category.label}
          </p>
          <h3 className="mt-1 text-base font-semibold leading-snug text-[#2e3338]">
            {product.name}
          </h3>
        </div>

        <p className="text-sm leading-relaxed text-[#5c5e66]">
          {product.description}
        </p>

        <ul className="space-y-1.5">
          {product.specs.map((spec) => (
            <li
              key={spec}
              className="flex items-start gap-2 text-xs leading-relaxed text-[#5c5e66]"
            >
              <span
                className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center"
                style={{ color: accent }}
              >
                <CheckIcon className="h-3 w-3" />
              </span>
              <span>{spec}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-1 pt-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-lg font-bold" style={{ color: accent }}>
              {formatAccessoryPrice(product.price)}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#80848e]">
              Free ship
            </span>
          </div>
          <span className="pb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#15803D]">
            In stock
          </span>
        </div>

        <button
          type="button"
          aria-pressed={added}
          aria-label={
            added
              ? `Remove ${product.name} from cart`
              : `Add ${product.name} to cart`
          }
          onClick={() => onToggle(product)}
          className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors ${
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
    </article>
  );
}
