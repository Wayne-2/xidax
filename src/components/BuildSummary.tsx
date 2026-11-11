"use client";

import { formatPrice, type BuildPart } from "@/data/customBuild";
import {
  ArrowIcon,
  CheckIcon,
  ComponentIcon,
  XIcon,
} from "@/components/BuildIcons";

type BuildSummaryProps = {
  projectName: string;
  pathLabel: string;
  modelLabel: string;
  modelDescription: string;
  modelTags: string[];
  selectedParts: BuildPart[];
  total: number;
  partsCount: number;
  onRemovePart: (partId: string) => void;
  onReset: () => void;
};

const buildNotes = [
  "Compatibility checked across every selected component.",
  "Professional assembly, cable management, and 24-hour stress testing.",
  "Windows 11, drivers, and updates installed before dispatch.",
  "Ships in 3–5 business days after your configuration is confirmed.",
];

export default function BuildSummary({
  projectName,
  pathLabel,
  modelLabel,
  modelDescription,
  modelTags,
  selectedParts,
  total,
  partsCount,
  onRemovePart,
  onReset,
}: BuildSummaryProps) {
  const selectedCount = selectedParts.length;
  const remaining = partsCount - selectedCount;
  const progress =
    partsCount > 0 ? Math.round((selectedCount / partsCount) * 100) : 0;

  return (
    <aside
      data-reveal="up"
      style={{ animationDelay: "160ms" }}
      className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto [scrollbar-width:thin]"
    >
      <div className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#80848e]">
            Build Summary
          </h2>
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-medium text-[#5865F2] transition-colors hover:text-[#4752C4]"
            >
              Reset
            </button>
          )}
        </div>

        <p className="mt-2 text-lg font-bold leading-snug tracking-tight text-[#2e3338]">
          {projectName.trim() || "Untitled build"}
        </p>
        <p className="mt-1 text-xs font-medium text-[#5c5e66]">
          {pathLabel} · {modelLabel}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#5c5e66]">
          {modelDescription}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {modelTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[#d2dbe8] bg-white/70 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#5c5e66]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 text-xs font-medium text-[#5c5e66]">
          <span>
            {selectedCount} of {partsCount} components
          </span>
          <span>{progress}%</span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#dce3ee]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={partsCount}
          aria-valuenow={selectedCount}
          aria-valuetext={`${selectedCount} of ${partsCount} components selected`}
          aria-label="Build progress"
        >
          <div
            className="h-full rounded-full bg-[#5865F2] transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[#80848e]">
          {remaining === 0
            ? "Build complete · Ready to add to cart"
            : `${remaining} component${
                remaining === 1 ? "" : "s"
              } remaining to complete your build.`}
        </p>
      </div>

      <div className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#80848e]">
            Your Components
          </h2>
          <span className="text-[11px] font-semibold text-[#5c5e66]">
            {selectedCount} selected
          </span>
        </div>

        {selectedCount > 0 ? (
          <ul className="mt-4 space-y-3">
            {selectedParts.map((part) => (
              <li
                key={part.id}
                className="rounded-xl border border-[#dce3ee] bg-[#f8fafe] p-3"
              >
                <div className="flex items-start gap-3">
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#d2dbe8] bg-gradient-to-br from-[#dce3ee] via-[#eaf0f8] to-[#d2dbe8]">
                    <ComponentIcon className="h-5 w-5 text-[#5865F2]" />
                    <span className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#5865F2] text-white">
                      <CheckIcon className="h-2 w-2" />
                    </span>
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#80848e]">
                          {part.category}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold leading-snug text-[#2e3338]">
                          {part.name}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="text-xs font-bold text-[#5865F2]">
                          {formatPrice(part.price)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemovePart(part.id)}
                          aria-label={`Remove ${part.name}`}
                          className="flex h-6 w-6 items-center justify-center rounded-full text-[#80848e] transition-colors hover:bg-[#dce3ee] hover:text-[#2e3338]"
                        >
                          <XIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="mt-1.5 text-xs leading-relaxed text-[#5c5e66]">
                      {part.description}
                    </p>

                    <ul className="mt-2 space-y-1">
                      {part.specs.map((spec) => (
                        <li
                          key={spec}
                          className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[#4e5058]"
                        >
                          <CheckIcon className="mt-0.5 h-3 w-3 shrink-0 text-[#5865F2]" />
                          {spec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-[#d2dbe8] bg-[#f8fafe] p-4 text-center">
            <p className="text-sm font-semibold text-[#2e3338]">
              No components yet
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#5c5e66]">
              Pick a component from the build list to see its full details
              here.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-4 sm:p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#80848e]">
          Build Notes
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#5c5e66]">
          Configured on the {modelLabel} platform. Every build is assembled and
          tested by our team before it leaves the workshop.
        </p>
        <ul className="mt-3 space-y-2">
          {buildNotes.map((note) => (
            <li
              key={note}
              className="flex items-start gap-2 text-xs leading-relaxed text-[#4e5058]"
            >
              <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#15803D]" />
              {note}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-[#5865F2]/25 bg-[#eaf0f8] p-4 shadow-sm shadow-[#5865F2]/5 sm:p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#80848e]">
              Estimated total
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-[#2e3338]">
              {formatPrice(total)}
            </p>
          </div>
          <p className="pb-1 text-[11px] text-[#5c5e66]">
            {remaining === 0
              ? "Build complete"
              : `${remaining} component${remaining === 1 ? "" : "s"} left`}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={selectedCount === 0}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add build to cart
            <ArrowIcon />
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-[#d2dbe8] px-4 text-sm font-medium text-[#4e5058] transition-colors hover:border-[#b8c4d6] hover:text-[#2e3338]"
          >
            Save build
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-[#80848e]">
          Taxes and shipping calculated at checkout.
        </p>
      </div>
    </aside>
  );
}
