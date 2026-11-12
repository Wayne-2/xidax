"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LaptopArtwork from "@/components/LaptopArtwork";
import { CartIcon } from "@/components/AccessoryIcons";
import { CheckIcon, ChevronDownIcon } from "@/components/BuildIcons";
import {
  formatLaptopPrice,
  type Laptop,
  type LaptopCategory,
} from "@/data/laptops";

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
  const accent = category.accent;
  const inStock = laptop.stock === "in-stock";
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const updateOverflow = useCallback(() => {
    const element = contentRef.current;

    if (!element) return;

    setOverflowing(element.scrollHeight > element.clientHeight + 1);
  }, []);

  useEffect(() => {
    const element = contentRef.current;

    if (!element) return;

    const handle = () => updateOverflow();
    const frame = requestAnimationFrame(handle);
    const observer = new ResizeObserver(handle);

    observer.observe(element);
    Array.from(element.children).forEach((child) =>
      observer.observe(child as Element)
    );
    window.addEventListener("load", handle);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("load", handle);
    };
  }, [updateOverflow]);

  return (
    <article
      data-laptop-card
      className={`group flex flex-col overflow-hidden rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] transition-colors hover:border-[#5865F2]/60 ${
        expanded ? "aspect-auto sm:aspect-auto" : "aspect-[1/2] sm:aspect-auto"
      }`}
    >
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-[#dce3ee]">
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

        <div className="absolute inset-0 flex items-center justify-center p-6">
          <LaptopArtwork
            category={category.id}
            accent={accent}
            label={`${laptop.name} illustration`}
          />
        </div>

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

      <div
        ref={contentRef}
        className="relative flex flex-1 flex-col overflow-hidden p-6"
      >
        <h3 className="text-xl font-bold tracking-tight text-[#2e3338]">
          {laptop.name}
        </h3>
        <p className="mt-1 text-sm font-medium" style={{ color: accent }}>
          {laptop.tagline}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#5c5e66]">
          {laptop.description}
        </p>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {laptop.highlights.map((highlight) => (
            <li
              key={highlight}
              className="flex items-start gap-2 text-xs leading-relaxed text-[#5c5e66]"
            >
              <span
                className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center"
                style={{ color: accent }}
              >
                <CheckIcon className="h-3 w-3" />
              </span>
              <span>{highlight}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-[#d2dbe8] bg-[#f8fafe] p-4">
          {laptop.specs.map((spec) => (
            <div key={spec.label} className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
                {spec.label}
              </dt>
              <dd className="mt-0.5 truncate text-xs font-semibold text-[#2e3338]">
                {spec.value}
              </dd>
            </div>
          ))}
        </dl>

        {overflowing && !expanded && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#eaf0f8] via-[#eaf0f8]/70 to-transparent"
          />
        )}
      </div>

      <div className="shrink-0 p-6 pt-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span
              className="text-2xl font-bold tracking-tight"
              style={{ color: accent }}
            >
              {formatLaptopPrice(laptop.price)}
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

            {(overflowing || expanded) && (
              <button
                type="button"
                onClick={() => setExpanded((open) => !open)}
                aria-expanded={expanded}
                aria-label={
                  expanded
                    ? `Hide details for ${laptop.name}`
                    : `Show all details for ${laptop.name}`
                }
                className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-[#d2dbe8] bg-[#f8fafe] text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338] sm:hidden"
              >
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform duration-300 ${
                    expanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
