"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import PrebuildCard from "@/components/PrebuildCard";
import { ChevronRightIcon } from "@/components/ConsoleIcons";
import { CloseIcon } from "@/components/SupportIcons";
import type { Prebuild } from "@/data/prebuilds";
import { useRegion } from "@/components/RegionProvider";

export type PlatformFilter = "all" | "intel" | "amd";
type SortKey = "featured" | "price-asc" | "price-desc" | "name-asc";

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
    label: (format) => `${format(1500)} – ${format(2500)}`,
    min: 1500,
    max: 2500,
  },
  {
    value: "2500-3999",
    label: (format) => `${format(2500)} – ${format(3999)}`,
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

const platformOptions: { value: PlatformFilter; label: string }[] = [
  { value: "all", label: "All platforms" },
  { value: "intel", label: "Intel" },
  { value: "amd", label: "AMD" },
];

const stockOptions = [
  { value: "in-stock", label: "In stock now" },
  { value: "built-to-order", label: "Built to order" },
];

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A–Z" },
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

function sortProducts(products: Prebuild[], sort: SortKey): Prebuild[] {
  if (sort === "featured") return products;

  const copy = [...products];

  if (sort === "price-asc") {
    copy.sort((a, b) => a.price - b.price);
  } else if (sort === "price-desc") {
    copy.sort((a, b) => b.price - a.price);
  } else {
    copy.sort((a, b) => a.name.localeCompare(b.name));
  }

  return copy;
}

function FilterGroup({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={className}>
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

function FilterRadio({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-[#5c5e66] transition-colors hover:text-[#2e3338]">
      <input
        type="radio"
        name="prebuild-platform"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 shrink-0 accent-[#5865F2]"
      />
      <span className="min-w-0 flex-1">{label}</span>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          checked
            ? "bg-[#5865F2]/10 text-[#4752C4]"
            : "bg-[#dce3ee]/70 text-[#5c5e66]"
        }`}
      >
        {count}
      </span>
    </label>
  );
}

export default function PrebuildsBrowser({
  products,
}: {
  products: Prebuild[];
}) {
  const { formatMoney } = useRegion();
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [priceFilters, setPriceFilters] = useState<string[]>([]);
  const [stockFilters, setStockFilters] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const matchesExceptPlatform = (product: Prebuild) => {
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

  const baseProducts = products.filter(matchesExceptPlatform);
  const platformCounts = {
    all: baseProducts.length,
    intel: baseProducts.filter((product) => product.brand === "intel").length,
    amd: baseProducts.filter((product) => product.brand === "amd").length,
  };

  const filtered =
    platform === "all"
      ? baseProducts
      : baseProducts.filter((product) => product.brand === platform);

  const sorted = sortProducts(filtered, sort);

  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (platform !== "all") {
    chips.push({
      key: "platform",
      label: platform === "intel" ? "Intel" : "AMD",
      onRemove: () => setPlatform("all"),
    });
  }

  priceFilters.forEach((value) => {
    const range = priceRanges.find((item) => item.value === value);
    if (!range) return;
    chips.push({
      key: `price-${value}`,
      label: range.label(formatMoney),
      onRemove: () =>
        setPriceFilters((current) => current.filter((item) => item !== value)),
    });
  });

  stockFilters.forEach((value) => {
    const option = stockOptions.find((item) => item.value === value);
    if (!option) return;
    chips.push({
      key: `stock-${value}`,
      label: option.label,
      onRemove: () =>
        setStockFilters((current) => current.filter((item) => item !== value)),
    });
  });

  const activeFilterCount = chips.length;

  const clearAllFilters = () => {
    setPlatform("all");
    setPriceFilters([]);
    setStockFilters([]);
  };

  return (
    <section className="border-t border-[#dce3ee] bg-[#f0f4fa]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-16">
        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8 xl:gap-10">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              aria-controls="prebuild-filters"
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] px-5 py-4 text-left shadow-card transition-colors hover:border-[#b8c4d6] hover:shadow-card-hover lg:hidden"
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
                className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-5 shadow-card"
              >
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2e3338]">
                    Filters
                  </h2>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="text-xs font-medium text-[#5865F2] transition-colors hover:text-[#4752C4]"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="mt-5">
                  <FilterGroup title="Platform">
                    {platformOptions.map((option) => (
                      <FilterRadio
                        key={option.value}
                        label={option.label}
                        count={platformCounts[option.value]}
                        checked={platform === option.value}
                        onChange={() => setPlatform(option.value)}
                      />
                    ))}
                  </FilterGroup>

                  <FilterGroup
                    title="Availability"
                    className="mt-5 border-t border-[#dce3ee] pt-5"
                  >
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

                  <FilterGroup
                    title="Price"
                    className="mt-5 border-t border-[#dce3ee] pt-5"
                  >
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

                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="sr-only">Prebuild catalogue</h2>
                <p
                  data-reveal="up"
                  className="text-sm text-[#5c5e66]"
                >
                  <span className="text-base font-bold text-[#2e3338]">
                    {sorted.length}
                  </span>{" "}
                  {sorted.length === 1 ? "result" : "results"}
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-[#5c5e66]">
                <span className="shrink-0">Sort by</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                  className="h-10 cursor-pointer rounded-lg border border-[#d2dbe8] bg-white px-3 text-sm font-semibold text-[#2e3338] transition-colors hover:border-[#b8c4d6] focus:border-[#5865F2] focus:outline-none"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {chips.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={chip.onRemove}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#5865F2]/30 bg-[#5865F2]/10 py-1.5 pl-3 pr-2.5 text-xs font-semibold text-[#4752C4] transition-colors hover:bg-[#5865F2]/15"
                  >
                    {chip.label}
                    <CloseIcon className="h-3 w-3" />
                    <span className="sr-only">Remove filter</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-[#5c5e66] transition-colors hover:text-[#5865F2]"
                >
                  Clear all
                </button>
              </div>
            )}

            {sorted.length > 0 ? (
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {sorted.map((product) => (
                  <PrebuildCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[#d2dbe8] bg-[#f8fafe] p-10 text-center">
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
  );
}
