"use client";

import Image from "next/image";
import type { BuildPart } from "@/data/customBuild";
import { CheckIcon } from "@/components/BuildIcons";
import BuildComponentTray from "@/components/BuildComponentTray";

type BuildPreviewProps = {
  projectName: string;
  pathLabel: string;
  modelLabel: string;
  selectedParts: BuildPart[];
  selectedCount: number;
  partsCount: number;
};

const bubblePositions: Array<{
  top: string;
  left?: string;
  right?: string;
}> = [
  { top: "14%", left: "7%" },
  { top: "20%", right: "8%" },
  { top: "38%", left: "5%" },
  { top: "44%", right: "6%" },
  { top: "61%", left: "9%" },
  { top: "68%", right: "8%" },
  { top: "81%", left: "7%" },
  { top: "86%", right: "10%" },
];

const mobileBubblePositions: Array<{
  top: string;
  left?: string;
  right?: string;
}> = [
  { top: "11%", left: "3%" },
  { top: "27%", right: "3%" },
  { top: "48%", left: "3%" },
  { top: "64%", right: "3%" },
];

const gridStyle = {
  backgroundImage:
    "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
  backgroundSize: "32px 32px",
  maskImage: "linear-gradient(to right, transparent 0%, black 45%, black 100%)",
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0%, black 45%, black 100%)",
};

export default function BuildPreview({
  projectName,
  pathLabel,
  modelLabel,
  selectedParts,
  selectedCount,
  partsCount,
}: BuildPreviewProps) {
  const progress =
    partsCount > 0 ? Math.round((selectedCount / partsCount) * 100) : 0;

  return (
    <div
      data-reveal="up"
      style={{ animationDelay: "80ms" }}
      className="overflow-hidden rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto [scrollbar-width:thin]"
    >
      <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden bg-[#dce3ee] p-6 sm:min-h-[500px] sm:p-10 lg:min-h-[560px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={gridStyle}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#5865F2]/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-white/50 blur-3xl"
        />

        <div className="absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-2 sm:inset-x-5 sm:top-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/85 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#5865F2] shadow-sm backdrop-blur sm:px-3 sm:text-[10px]">
            <span className="animate-badge-pulse h-1.5 w-1.5 rounded-full bg-[#5865F2]" />
            Live preview
          </span>
          <span className="rounded-full border border-white/60 bg-white/85 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#5c5e66] shadow-sm backdrop-blur sm:px-3 sm:text-[10px]">
            {modelLabel} · {selectedCount}/{partsCount}
          </span>
        </div>

        <Image
          src="/hero_image.png"
          alt={`${modelLabel} custom build preview`}
          width={900}
          height={900}
          priority
          sizes="(min-width: 1280px) 34vw, (min-width: 1024px) 40vw, 85vw"
          className="relative z-10 h-auto w-full max-w-[15rem] object-contain drop-shadow-[0_24px_48px_rgba(46,51,56,0.24)] sm:max-w-[22rem] lg:max-w-[24rem]"
        />

        {selectedParts.slice(0, mobileBubblePositions.length).map((part, index) => (
          <span
            key={`mobile-${part.id}`}
            style={mobileBubblePositions[index]}
            className="pointer-events-none absolute z-20 flex max-w-[6.5rem] items-center gap-1 rounded-full border border-white/70 bg-white/90 px-2 py-1 text-[9px] font-semibold leading-snug text-[#2e3338] shadow-[0_8px_20px_-8px_rgba(46,51,56,0.35)] backdrop-blur xl:hidden"
          >
            <span className="h-1 w-1 shrink-0 rounded-full bg-[#5865F2]" />
            <span className="line-clamp-2">{part.name}</span>
          </span>
        ))}

        {selectedParts.slice(0, bubblePositions.length).map((part, index) => (
          <span
            key={`desktop-${part.id}`}
            style={bubblePositions[index]}
            className="pointer-events-none absolute z-20 hidden max-w-[9.5rem] items-center gap-1.5 rounded-full border border-white/70 bg-white/90 px-2.5 py-1.5 text-[10px] font-semibold leading-snug text-[#2e3338] shadow-[0_8px_20px_-8px_rgba(46,51,56,0.35)] backdrop-blur xl:flex"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#5865F2]" />
            <span className="line-clamp-2">{part.name}</span>
          </span>
        ))}

        <div className="absolute inset-x-3 bottom-3 z-20 flex items-end justify-between gap-3 sm:inset-x-5 sm:bottom-5">
          <span className="max-w-[60%] truncate rounded-full border border-white/60 bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-[#2e3338] shadow-sm backdrop-blur sm:px-3 sm:text-[11px]">
            {projectName.trim() || "Your dream build"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/85 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#5c5e66] shadow-sm backdrop-blur sm:px-3 sm:text-[10px]">
            <CheckIcon className="h-3 w-3 text-[#15803D]" />
            {pathLabel}
          </span>
        </div>
      </div>

      <div className="border-t border-[#dce3ee] bg-[#eaf0f8] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#80848e]">
            Build progress
          </span>
          <span className="text-[11px] font-semibold text-[#2e3338]">
            {progress}%
          </span>
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

        <div className="mt-4">
          <BuildComponentTray parts={selectedParts} />
        </div>
      </div>
    </div>
  );
}
