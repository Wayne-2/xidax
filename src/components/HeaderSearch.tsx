"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  accessories,
  accessoryCategories,
} from "@/data/accessories";
import { laptops, laptopCategories } from "@/data/laptops";
import { prebuilds } from "@/data/prebuilds";

type SearchItem = {
  id: string;
  title: string;
  subtitle: string;
  kind: string;
  href: string;
  price?: number;
  keywords: string;
};

type HeaderSearchProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const suggestions = [
  "RTX 5080",
  "Creator",
  "Keyboard",
  "240Hz",
  "Mice",
  "RTX 4060",
];

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function SearchIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CloseIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function scoreItem(item: SearchItem, query: string) {
  const title = item.title.toLowerCase();
  const kind = item.kind.toLowerCase();
  const keywords = item.keywords.toLowerCase();

  if (title === query) return 100;
  if (title.startsWith(query)) return 80;
  if (title.includes(query)) return 60;
  if (kind.includes(query)) return 40;
  if (keywords.includes(query)) return 20;

  return 0;
}

export default function HeaderSearch({ open, onOpenChange }: HeaderSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const index = useMemo<SearchItem[]>(() => {
    const items: SearchItem[] = [];

    for (const laptop of laptops) {
      const category = laptopCategories.find(
        (entry) => entry.id === laptop.category,
      );

      items.push({
        id: `laptop-${laptop.id}`,
        title: laptop.name,
        subtitle: `${laptop.tagline} · ${laptop.specs[0]?.value ?? ""}`,
        kind: category?.label ?? "Laptop",
        href: `/laptops#${laptop.category}`,
        price: laptop.price,
        keywords: [
          laptop.tagline,
          laptop.description,
          category?.label ?? "",
          ...laptop.specs.map((spec) => `${spec.label} ${spec.value}`),
          ...laptop.highlights,
        ]
          .join(" ")
          .toLowerCase(),
      });
    }

    for (const accessory of accessories) {
      const category = accessoryCategories.find(
        (entry) => entry.id === accessory.category,
      );

      items.push({
        id: `accessory-${accessory.id}`,
        title: accessory.name,
        subtitle: accessory.description,
        kind: category?.label ?? "Accessory",
        href: `/accessories#${accessory.category}`,
        price: accessory.price,
        keywords: [
          accessory.description,
          category?.label ?? "",
          ...accessory.specs,
        ]
          .join(" ")
          .toLowerCase(),
      });
    }

    for (const prebuild of prebuilds) {
      items.push({
        id: `prebuild-${prebuild.id}`,
        title: prebuild.name,
        subtitle: prebuild.specs,
        kind: "Prebuilt PC",
        href: "/prebuilds",
        price: prebuild.price,
        keywords: `${prebuild.specs} ${prebuild.brand} prebuilt`.toLowerCase(),
      });
    }

    return items;
  }, []);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) return [];

    return index
      .map((item) => ({ item, score: scoreItem(item, term) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 7)
      .map((entry) => entry.item);
  }, [index, query]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setQuery("");
        onOpenChange(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setQuery("");
        onOpenChange(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  function goTo(item: SearchItem) {
    onOpenChange(false);
    router.push(item.href);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (results.length > 0) {
      goTo(results[0]);
    }
  }

  return (
    <div ref={containerRef} className="relative flex items-center">
      <div
        className={`fixed left-4 right-4 top-3 z-[60] overflow-hidden rounded-full transition-all duration-300 ease-out sm:absolute sm:left-auto sm:right-full sm:top-1/2 sm:mr-2 sm:-translate-y-1/2 ${
          open
            ? "translate-x-0 opacity-100 sm:max-w-[20rem]"
            : "pointer-events-none -translate-x-2 opacity-0 sm:max-w-0"
        }`}
      >
        <form
          onSubmit={handleSubmit}
          className="flex h-10 w-full items-center gap-2 rounded-full border border-[#d2dbe8] bg-[#f8fafe] px-3 shadow-[0_18px_40px_-18px_rgba(46,51,56,0.35)] transition-colors focus-within:border-[#5865F2] sm:w-[20rem]"
        >
          <SearchIcon className="h-4 w-4 shrink-0 text-[#80848e]" />
          <label htmlFor="site-search" className="sr-only">
            Search products
          </label>
          <input
            id="site-search"
            ref={inputRef}
            value={query}
            tabIndex={open ? 0 : -1}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search laptops, accessories, prebuilds…"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-sm text-[#2e3338] outline-none placeholder:text-[#80848e]"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              tabIndex={open ? 0 : -1}
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="hidden h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#80848e] transition-colors hover:bg-[#dce3ee] hover:text-[#2e3338] sm:flex"
            >
              <CloseIcon className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            aria-label="Close search"
            tabIndex={open ? 0 : -1}
            onClick={() => {
              setQuery("");
              onOpenChange(false);
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#80848e] transition-colors hover:bg-[#dce3ee] hover:text-[#2e3338] sm:hidden"
          >
            <CloseIcon className="h-3 w-3" />
          </button>
        </form>
      </div>

      <button
        type="button"
        aria-label={open ? "Close search" : "Search"}
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setQuery("");
          }

          onOpenChange(!open);
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full text-[#5c5e66] transition-colors hover:bg-black/5 hover:text-[#2e3338]"
      >
        {open ? (
          <CloseIcon className="h-5 w-5" />
        ) : (
          <SearchIcon className="h-5 w-5" />
        )}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-x-0 top-[4.75rem] z-[70] flex justify-center px-4">
            <div className="w-full max-w-[22rem] overflow-hidden rounded-2xl border border-[#d2dbe8] bg-[#f8fafe] shadow-[0_24px_60px_-20px_rgba(46,51,56,0.45)]">
              {query.trim() ? (
                results.length > 0 ? (
                  <>
                    <p className="border-b border-[#dce3ee] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#80848e]">
                      {results.length} result{results.length === 1 ? "" : "s"}
                    </p>
                    <ul className="max-h-[22rem] overflow-y-auto p-1.5">
                      {results.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => goTo(item)}
                            className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-[#f0f4fa]"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#5865F2]/10 text-[#5865F2]">
                              <SearchIcon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-[#2e3338]">
                                {item.title}
                              </span>
                              <span className="block truncate text-xs text-[#5c5e66]">
                                {item.kind} · {item.subtitle}
                              </span>
                            </span>
                            {item.price !== undefined && (
                              <span className="shrink-0 text-xs font-semibold text-[#5865F2]">
                                {priceFormatter.format(item.price)}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm font-semibold text-[#2e3338]">
                      No matches for “{query.trim()}”
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#5c5e66]">
                      Try a model name, a component, or a category.
                    </p>
                  </div>
                )
              ) : (
                <div className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#80848e]">
                    Popular searches
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setQuery(suggestion)}
                        className="rounded-full border border-[#d2dbe8] bg-[#f0f4fa] px-3 py-1.5 text-xs font-semibold text-[#4e5058] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338]"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
