"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import PrebuildCard from "@/components/PrebuildCard";
import PrebuildFilters, {
  type PlatformFilter,
  type RefinementFilter,
} from "@/components/PrebuildFilters";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/AccessoryIcons";
import type { Prebuild } from "@/data/prebuilds";

const priceRanges = [
  { value: "under-1500", label: "Under $1,500", min: 0, max: 1499 },
  { value: "1500-2500", label: "$1,500 - $2,500", min: 1500, max: 2500 },
  { value: "2500-3999", label: "$2,500 - $3,999", min: 2501, max: 3999 },
  {
    value: "4000-plus",
    label: "$4,000+",
    min: 4000,
    max: Number.POSITIVE_INFINITY,
  },
];

const stockOptions = [
  { value: "in-stock", label: "In stock now" },
  { value: "built-to-order", label: "Built in order" },
];

const brandOptions = [
  { value: "amd", label: "AMD - Ryzen" },
  { value: "intel", label: "Intel - Core" },
];

const refinementOptions: { value: RefinementFilter; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "in-stock", label: "In stock only" },
  { value: "flagship", label: "Flagship only" },
  { value: "under-2k", label: "Under $2,000" },
];

function matchesPrice(price: number, rangeValue: string) {
  const range = priceRanges.find((item) => item.value === rangeValue);
  return range ? price >= range.min && price <= range.max : false;
}

function toggleValue(
  value: string,
  selected: string[],
  setSelected: (next: string[]) => void
) {
  setSelected(
    selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#80848e]">
        {title}
      </legend>
      <div className="mt-3 space-y-2.5">{children}</div>
    </fieldset>
  );
}

function FilterCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-[#4e5058] transition-colors hover:text-[#2e3338]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 shrink-0 accent-[#5865F2]"
      />
      <span>{label}</span>
    </label>
  );
}

export default function PrebuildsBrowser({
  products,
}: {
  products: Prebuild[];
}) {
  const [refinement, setRefinement] = useState<RefinementFilter>("all");
  const [priceFilters, setPriceFilters] = useState<string[]>([]);
  const [stockFilters, setStockFilters] = useState<string[]>([]);
  const [brandFilters, setBrandFilters] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const platform: PlatformFilter =
    brandFilters.length === 1 ? (brandFilters[0] as PlatformFilter) : "all";

  const matchesExceptBrand = (product: Prebuild) => {
    if (refinement === "in-stock" && product.stock !== "in-stock") return false;
    if (refinement === "flagship" && !product.flagship) return false;
    if (refinement === "under-2k" && product.price >= 2000) return false;
    if (
      priceFilters.length > 0 &&
      !priceFilters.some((value) => matchesPrice(product.price, value))
    ) {
      return false;
    }
    if (stockFilters.length > 0 && !stockFilters.includes(product.stock)) {
      return false;
    }
    return true;
  };

  const baseProducts = products.filter(matchesExceptBrand);
  const platformCounts = {
    all: baseProducts.length,
    intel: baseProducts.filter((product) => product.brand === "intel").length,
    amd: baseProducts.filter((product) => product.brand === "amd").length,
  };

  const filtered = baseProducts.filter(
    (product) =>
      brandFilters.length === 0 || brandFilters.includes(product.brand)
  );

  const hasSidebarFilters =
    priceFilters.length > 0 ||
    stockFilters.length > 0 ||
    brandFilters.length > 0 ||
    refinement !== "all";

  const activeFilterCount =
    priceFilters.length +
    stockFilters.length +
    brandFilters.length +
    (refinement === "all" ? 0 : 1);

  const clearSidebarFilters = () => {
    setPriceFilters([]);
    setStockFilters([]);
    setBrandFilters([]);
  };

  const clearAllFilters = () => {
    clearSidebarFilters();
    setRefinement("all");
  };

  const handlePlatformChange = (next: PlatformFilter) => {
    if (next === "all") {
      setBrandFilters([]);
    } else {
      setBrandFilters([next]);
    }
  };

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

    track.addEventListener("scroll", handle, { passive: true });
    window.addEventListener("resize", handle);

    return () => {
      cancelAnimationFrame(frame);
      track.removeEventListener("scroll", handle);
      window.removeEventListener("resize", handle);
    };
  }, [updateScrollState, filtered.length]);

  function scrollTrack(direction: -1 | 1) {
    const track = trackRef.current;

    if (!track) return;

    const card = track.querySelector<HTMLElement>("[data-prebuild-item]");
    const amount = card ? card.offsetWidth + 20 : track.clientWidth * 0.8;

    track.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  return (
    <>
      <section className="hidden bg-[#f0f4fa] lg:block">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <PrebuildFilters
            platform={platform}
            refinement={refinement}
            counts={platformCounts}
            onPlatformChange={handlePlatformChange}
            onRefinementChange={setRefinement}
          />
        </div>
      </section>

      <section className="border-t border-[#dce3ee] bg-[#f0f4fa]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-16">
          <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8 xl:gap-10">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
                aria-controls="prebuild-filters"
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] px-5 py-4 text-left transition-colors hover:border-[#b8c4d6] lg:hidden"
              >
                <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2e3338]">
                  Filters
                </span>
                <span className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-[#5865F2] px-2 py-0.5 text-[11px] font-semibold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                  <ChevronRightIcon
                    className={`h-4 w-4 text-[#5c5e66] transition-transform duration-300 ${
                      filtersOpen ? "rotate-90" : ""
                    }`}
                  />
                </span>
              </button>

              <div
                id="prebuild-filters"
                className={`${filtersOpen ? "mt-3 block" : "hidden"} lg:mt-0 lg:block`}
              >
                <div
                  data-reveal="up"
                  className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-5 sm:p-6"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="hidden text-sm font-semibold uppercase tracking-[0.2em] text-[#2e3338] lg:block">
                      Filters
                    </h2>
                    {hasSidebarFilters && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="text-xs font-medium text-[#5865F2] transition-colors hover:text-[#4752C4]"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="mt-6 space-y-7">
                    <div className="lg:hidden">
                      <FilterGroup title="Refine">
                        {refinementOptions.map((option) => (
                          <label
                            key={option.value}
                            className="flex cursor-pointer items-center gap-3 text-sm text-[#4e5058] transition-colors hover:text-[#2e3338]"
                          >
                            <input
                              type="radio"
                              name="prebuild-refinement"
                              checked={refinement === option.value}
                              onChange={() => setRefinement(option.value)}
                              className="h-4 w-4 shrink-0 accent-[#5865F2]"
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </FilterGroup>
                    </div>

                    <FilterGroup title="Price">
                      {priceRanges.map((range) => (
                        <FilterCheckbox
                          key={range.value}
                          label={range.label}
                          checked={priceFilters.includes(range.value)}
                          onChange={() =>
                            toggleValue(
                              range.value,
                              priceFilters,
                              setPriceFilters
                            )
                          }
                        />
                      ))}
                    </FilterGroup>

                    <FilterGroup title="Stock">
                      {stockOptions.map((option) => (
                        <FilterCheckbox
                          key={option.value}
                          label={option.label}
                          checked={stockFilters.includes(option.value)}
                          onChange={() =>
                            toggleValue(
                              option.value,
                              stockFilters,
                              setStockFilters
                            )
                          }
                        />
                      ))}
                    </FilterGroup>

                    <FilterGroup title="Brand">
                      {brandOptions.map((option) => (
                        <FilterCheckbox
                          key={option.value}
                          label={option.label}
                          checked={brandFilters.includes(option.value)}
                          onChange={() =>
                            toggleValue(
                              option.value,
                              brandFilters,
                              setBrandFilters
                            )
                          }
                        />
                      ))}
                    </FilterGroup>
                  </div>
                </div>
              </div>
            </aside>

            <div className="min-w-0">
              <h2 className="sr-only">Prebuild catalogue</h2>

              <div className="flex items-center justify-between gap-4">
                <p
                  data-reveal="up"
                  className="text-sm font-medium text-[#5c5e66]"
                >
                  {filtered.length}{" "}
                  {filtered.length === 1 ? "item" : "items"} available
                </p>

                <div className="flex items-center gap-2 sm:hidden">
                  <button
                    type="button"
                    aria-label="Previous prebuilds"
                    disabled={!canScrollLeft}
                    onClick={() => scrollTrack(-1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d2dbe8] bg-[#f8fafe] text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next prebuilds"
                    disabled={!canScrollRight}
                    onClick={() => scrollTrack(1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d2dbe8] bg-[#f8fafe] text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {filtered.length > 0 ? (
                <div
                  ref={trackRef}
                  className="mt-4 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [scrollbar-width:none] sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:pb-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden"
                >
                  {filtered.map((product) => (
                    <div
                      key={product.id}
                      data-prebuild-item
                      className="flex w-[78%] shrink-0 snap-start sm:w-auto"
                    >
                      <PrebuildCard product={product} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-[#d2dbe8] bg-[#f8fafe] p-10 text-center">
                  <p className="text-sm font-semibold text-[#2e3338]">
                    No prebuilds match your filters.
                  </p>
                  <p className="mt-1 text-sm text-[#5c5e66]">
                    Try adjusting or clearing your filters.
                  </p>
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-[#5865F2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4]"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
