"use client";

import { useEffect, useRef, useState } from "react";
import { useRegion } from "@/components/RegionProvider";
import { currencyLabel, findRegion } from "@/lib/regions";

function CaretIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function RegionMenu({
  align = "right",
  variant = "dropdown",
  className = "",
}: {
  align?: "left" | "right";
  variant?: "dropdown" | "inline";
  className?: string;
}) {
  const { region, countries, setCountry } = useRegion();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || variant !== "dropdown") return;

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, variant]);

  const inline = variant === "inline";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Region: ${region.country}. Change country`}
        className={
          inline
            ? "inline-flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-[#dce3ee] bg-[#eaf0f8] px-3 text-xs font-semibold text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338]"
            : "inline-flex h-9 items-center gap-1.5 rounded-full border border-[#dce3ee] bg-[#f8fafe] px-3 text-xs font-semibold text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338]"
        }
      >
        <span className="flex items-center gap-2">
          {inline && <span className="text-[#80848e]">Ship to</span>}
          <span className="font-mono">{region.currency}</span>
          {inline && (
            <span className="truncate text-[#2e3338]">{region.country}</span>
          )}
        </span>
        <CaretIcon
          className={`h-3.5 w-3.5 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Choose your country"
          className={
            inline
              ? "mt-2 grid grid-cols-2 gap-1.5 rounded-xl border border-[#d2dbe8] bg-[#f8fafe] p-2"
              : `absolute z-50 mt-2 max-h-[70vh] w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-[#d2dbe8] bg-[#f8fafe] p-1.5 shadow-[0_24px_48px_-24px_rgba(46,51,56,0.45)] ${
                  align === "right" ? "right-0" : "left-0"
                }`
          }
        >
          {!inline && (
            <p className="px-2.5 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#80848e]">
              Ship to · currency · time zone
            </p>
          )}

          {countries.map((country) => {
            const active = country === region.country;
            const countryRegion = findRegion(country);

            return (
              <button
                key={country}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setCountry(country);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition-colors ${
                  active
                    ? "bg-[#5865F2]/10 font-semibold text-[#2e3338]"
                    : "text-[#5c5e66] hover:bg-[#eaf0f8] hover:text-[#2e3338]"
                }`}
              >
                <span className="truncate">{country}</span>
                <span className="shrink-0 font-mono text-[11px] text-[#80848e]">
                  {currencyLabel(countryRegion.currency)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
