"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import PrebuildCard from "@/components/PrebuildCard";
import PrebuildFilters, {
  type PlatformFilter,
  type RefinementFilter,
} from "@/components/PrebuildFilters";
import { ChevronRightIcon } from "@/components/ConsoleIcons";
import type { Prebuild } from "@/data/prebuilds";
import { useRegion } from "@/components/RegionProvider";

type PriceRange = {
  value: string;
  label: (format: (amountUsd: number) => string) => string;
  min: number;
  max: number;
};

const priceRanges: PriceRange[] = [
  {
    value: "under-1500",
    label: (format) => `Under ${format(1500)}`,
    min: 0,
    max: 1499,
  },
  {
    value: "1500-2500",
    label: (format) => `${format(1500)} - ${format(2500)}`,
    min: 1500,
    max: 2500,
  },
  {
    value: "2500-3999",
    label: (format) => `${format(2500)} - ${format(3999)}`,
    min: 2501,
    max: 3999,
  },
  {
    value: "4000-plus",
    label: (format) => `${format(4000)}+`,
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

const refinementOptions: {
  value: RefinementFilter;
  label: (format: (amountUsd: number) => string) => string;
}[] = [
  { value: "all", label: () => "Everything" },
  { value: "in-stock", label: () => "In stock only" },
  { value: "flagship", label: () => "Flagship only" },
  { value: "under-2k", label: (format) => `Under ${format(2000)}` },
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
    <label className="flex cursor-pointer items-center gap-3 text-sm text-[#5c5e66] transition-colors hover:text-[#2e3338]">
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
  const { formatMoney } = useRegion();
  const [refinement, setRefinement] = useState<RefinementFilter>("all");
  const [priceFilters, setPriceFilters] = useState<string[]>([]);
  const [stockFilters, setStockFilters] = useState<string[]>([]);
  const [brandFilters, setBrandFilters] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

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
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] shadow-card px-5 py-4 text-left transition-colors hover:border-[#b8c4d6] lg:hidden hover:shadow-card-hover"
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
                  className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] shadow-card p-5 sm:p-6"
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
                            className="flex cursor-pointer items-center gap-3 text-sm text-[#5c5e66] transition-colors hover:text-[#2e3338]"
                          >
                            <input
                              type="radio"
                              name="prebuild-refinement"
                              checked={refinement === option.value}
                              onChange={() => setRefinement(option.value)}
                              className="h-4 w-4 shrink-0 accent-[#5865F2]"
                            />
                            <span>{option.label(formatMoney)}</span>
                          </label>
                        ))}
                      </FilterGroup>
                    </div>

                    <FilterGroup title="Price">
                      {priceRanges.map((range) => (
                        <FilterCheckbox
                          key={range.value}
                          label={range.label(formatMoney)}
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

              <p
                data-reveal="up"
                className="text-sm font-medium text-[#5c5e66]"
              >
                {filtered.length}{" "}
                {filtered.length === 1 ? "item" : "items"} available
              </p>

              {filtered.length > 0 ? (
                <div className="mt-4 columns-1 gap-5 sm:mt-6 sm:columns-2 lg:columns-3">
                  {filtered.map((product) => (
                    <div
                      key={product.id}
                      className="mb-5 break-inside-avoid"
                    >
                      <PrebuildCard product={product} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-[#d2dbe8] bg-[#f8fafe] p-10 text-center">
                  {products.length === 0 ? (
                    <>
                      <p className="text-sm font-semibold text-[#2e3338]">
                        No products yet.
                      </p>
                      <p className="mt-1 text-sm text-[#5c5e66]">
                        Our prebuild catalogue is being prepared. Check back soon.
                      </p>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
