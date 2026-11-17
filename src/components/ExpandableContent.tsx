"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@/components/BuildIcons";

/**
 * Clamps card content to a fixed height and reveals the rest on demand.
 * The inner element is measured un-clamped, so the toggle only appears when
 * there is genuinely more content to show.
 */
export default function ExpandableContent({
  children,
  collapsedHeight = 230,
  fadeFrom = "#eaf0f8",
  label = "details",
}: {
  children: ReactNode;
  collapsedHeight?: number;
  fadeFrom?: string;
  label?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = innerRef.current;

    if (!el) return;

    const measure = () => setOverflowing(el.getBoundingClientRect().height > collapsedHeight + 4);

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);

    return () => observer.disconnect();
  }, [collapsedHeight, children]);

  return (
    <div>
      <div
        className="relative overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{ maxHeight: expanded ? undefined : collapsedHeight }}
      >
        <div ref={innerRef}>{children}</div>

        {!expanded && overflowing && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
            style={{
              background: `linear-gradient(to top, ${fadeFrom}, transparent)`,
            }}
          />
        )}
      </div>

      {(overflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#5865F2] transition-colors hover:text-[#4752C4]"
        >
          {expanded ? "Show less" : `Show more ${label}`}
          <ChevronDownIcon
            className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
}
