"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatPrice, type BuildPart } from "@/data/customBuild";
import { CheckIcon, ComponentIcon } from "@/components/BuildIcons";

type HoveredComponent = {
  part: BuildPart;
  rect: DOMRect;
};

type BuildComponentTrayProps = {
  parts: BuildPart[];
};

const placeholderGrid = {
  backgroundImage:
    "linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)",
  backgroundSize: "18px 18px",
  maskImage: "linear-gradient(to right, transparent 0%, black 40%, black 100%)",
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0%, black 40%, black 100%)",
};

export default function BuildComponentTray({
  parts,
}: BuildComponentTrayProps) {
  const [hovered, setHovered] = useState<HoveredComponent | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressScrollClose = useRef(false);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (suppressTimer.current) clearTimeout(suppressTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!hovered) return;

    const close = () => {
      if (suppressScrollClose.current) return;
      if (closeTimer.current) clearTimeout(closeTimer.current);
      setHovered(null);
    };

    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);

    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [hovered]);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setHovered(null), 140);
  };

  const showPreview = (part: BuildPart, element: HTMLElement) => {
    cancelClose();
    suppressScrollClose.current = true;
    if (suppressTimer.current) clearTimeout(suppressTimer.current);
    suppressTimer.current = setTimeout(() => {
      suppressScrollClose.current = false;
    }, 300);
    setHovered({ part, rect: element.getBoundingClientRect() });
  };

  const visibleHovered =
    hovered && parts.some((part) => part.id === hovered.part.id)
      ? hovered
      : null;

  return (
    <section aria-labelledby="selected-components-heading">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="selected-components-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#80848e]"
        >
          Selected components
        </h2>
        <span className="text-[11px] font-semibold text-[#5c5e66]">
          {parts.length} selected
        </span>
      </div>

      {parts.length > 0 ? (
        <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pt-1 [scrollbar-width:thin]">
          {parts.map((part) => (
            <button
              key={part.id}
              type="button"
              aria-label={`Preview ${part.name}`}
              onMouseEnter={(event) => showPreview(part, event.currentTarget)}
              onMouseLeave={scheduleClose}
              onFocus={(event) => showPreview(part, event.currentTarget)}
              onBlur={scheduleClose}
              onClick={(event) => showPreview(part, event.currentTarget)}
              className="group relative w-32 shrink-0 snap-start overflow-hidden rounded-xl border border-[#d2dbe8] bg-[#f8fafe] text-left transition-colors hover:border-[#5865F2]/50 focus-visible:border-[#5865F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2]/20"
            >
              <span className="relative flex h-20 items-center justify-center overflow-hidden bg-gradient-to-br from-[#dce3ee] via-[#eaf0f8] to-[#d2dbe8]">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-60"
                  style={placeholderGrid}
                />
                <ComponentIcon className="relative h-8 w-8 text-[#5865F2]/70 transition-transform duration-300 group-hover:scale-110" />
                <span className="absolute left-2 top-2 rounded-full bg-white/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[#5c5e66] backdrop-blur">
                  {part.category}
                </span>
                <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#5865F2] text-white">
                  <CheckIcon className="h-2.5 w-2.5" />
                </span>
              </span>
              <span className="block border-t border-[#dce3ee] bg-white/80 px-2.5 py-2">
                <span className="line-clamp-2 block text-[11px] font-semibold leading-snug text-[#2e3338]">
                  {part.name}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-[#d2dbe8] bg-[#f8fafe]/60 px-4 py-5 text-center">
          <p className="text-sm font-semibold text-[#2e3338]">
            No components selected yet
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#5c5e66]">
            Pick components from the build list to fill your preview.
          </p>
        </div>
      )}

      {visibleHovered &&
        typeof document !== "undefined" &&
        createPortal(
          <ComponentPreviewPopover
            hovered={visibleHovered}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          />,
          document.body
        )}
    </section>
  );
}

function ComponentPreviewPopover({
  hovered,
  onMouseEnter,
  onMouseLeave,
}: {
  hovered: HoveredComponent;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const { part, rect } = hovered;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(320, viewportWidth - 24);
  const left = Math.min(
    Math.max(12, rect.left + rect.width / 2 - width / 2),
    viewportWidth - width - 12
  );
  const spaceAbove = rect.top - 24;
  const spaceBelow = viewportHeight - rect.bottom - 24;
  const placeAbove = spaceAbove >= 320 || spaceAbove >= spaceBelow;
  const maxHeight = Math.min(
    420,
    Math.max(220, placeAbove ? spaceAbove : spaceBelow)
  );

  return (
    <div
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        left,
        width,
        maxHeight,
        ...(placeAbove
          ? { bottom: viewportHeight - rect.top + 12 }
          : { top: rect.bottom + 12 }),
      }}
      className="animate-dropdown-in fixed z-[80] overflow-y-auto rounded-2xl border border-[#d2dbe8] bg-white p-3.5 shadow-[0_24px_60px_-20px_rgba(46,51,56,0.35)] [scrollbar-width:thin]"
    >
      <div className="relative h-32 overflow-hidden rounded-xl border border-[#dce3ee] bg-gradient-to-br from-[#dce3ee] via-[#eaf0f8] to-[#d2dbe8]">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={placeholderGrid}
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <ComponentIcon className="h-14 w-14 text-[#5865F2]" />
        </span>
        <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#5865F2] backdrop-blur">
          {part.category}
        </span>
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#5865F2] text-white">
          <CheckIcon className="h-3 w-3" />
        </span>
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#80848e]">
            {part.category}
          </p>
          <h3 className="mt-0.5 text-base font-bold leading-snug text-[#2e3338]">
            {part.name}
          </h3>
        </div>
        <span className="shrink-0 text-base font-bold text-[#5865F2]">
          {formatPrice(part.price)}
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-[#5c5e66]">
        {part.description}
      </p>

      <ul className="mt-2.5 space-y-1.5">
        {part.specs.map((spec) => (
          <li
            key={spec}
            className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[#4e5058]"
          >
            <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5865F2]" />
            {spec}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-[#f0f4fa] px-2.5 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#80848e]">
          Included in build
        </span>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-[#15803D]">
          <CheckIcon className="h-3 w-3" />
          Selected
        </span>
      </div>
    </div>
  );
}
