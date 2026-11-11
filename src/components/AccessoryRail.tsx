"use client";

import { useRef } from "react";
import AccessoryCard from "@/components/AccessoryCard";
import {
  AccessoryCategoryIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/AccessoryIcons";
import type { Accessory, AccessoryCategory } from "@/data/accessories";

type AccessoryRailProps = {
  category: AccessoryCategory;
  products: Accessory[];
  addedIds: string[];
  onToggle: (product: Accessory) => void;
};

export default function AccessoryRail({
  category,
  products,
  addedIds,
  onToggle,
}: AccessoryRailProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollRail(direction: -1 | 1) {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    const card = track.querySelector<HTMLElement>("[data-accessory-card]");
    const amount = card ? card.offsetWidth + 16 : track.clientWidth * 0.8;

    track.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  return (
    <section
      id={category.id}
      aria-labelledby={`${category.id}-heading`}
      className="scroll-mt-32 border-t border-[#dce3ee] py-10 sm:py-12"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          data-reveal="up"
          className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="flex items-start gap-4">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#d2dbe8]"
              style={{
                backgroundColor: `${category.accent}14`,
                color: category.accent,
              }}
            >
              <AccessoryCategoryIcon
                category={category.id}
                className="h-6 w-6"
              />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#80848e]">
                {products.length} products
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

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              aria-label={`Scroll ${category.label} left`}
              onClick={() => scrollRail(-1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d2dbe8] bg-[#f8fafe] text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338]"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={`Scroll ${category.label} right`}
              onClick={() => scrollRail(1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d2dbe8] bg-[#f8fafe] text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338]"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((product) => (
            <AccessoryCard
              key={product.id}
              category={category}
              product={product}
              added={addedIds.includes(product.id)}
              onToggle={onToggle}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
