"use client";

import Link from "next/link";
import {
  buildPaths,
  formatPrice,
  type BuildModelId,
  type BuildPart,
} from "@/data/customBuild";
import { CheckIcon, DesktopIcon } from "@/components/BuildIcons";
import BuildModelSelect from "@/components/BuildModelSelect";

type BuildSidebarProps = {
  modelId: BuildModelId;
  parts: BuildPart[];
  selectedIds: string[];
  onModelChange: (modelId: BuildModelId) => void;
  onTogglePart: (partId: string) => void;
};

export default function BuildSidebar({
  modelId,
  parts,
  selectedIds,
  onModelChange,
  onTogglePart,
}: BuildSidebarProps) {
  const desktopPath =
    buildPaths.find((item) => item.id === "desktop") ?? buildPaths[0];

  return (
    <aside
      data-reveal="up"
      className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-4 sm:p-5"
    >
      <div className="flex items-center gap-3 rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-3 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5865F2]/10 text-[#5865F2]">
          <DesktopIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#80848e]">
            Build path
          </span>
          <span className="block text-sm font-semibold text-[#2e3338]">
            Desktops
          </span>
        </span>
      </div>

      <div className="mt-5">
        <BuildModelSelect
          models={desktopPath.models}
          value={modelId}
          onChange={onModelChange}
        />
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#80848e]">
            Components
          </h2>
          <span className="text-[11px] font-semibold text-[#5c5e66]">
            {selectedIds.length}/{parts.length}
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {parts.map((part, index) => {
            const selected = selectedIds.includes(part.id);

            return (
              <button
                key={part.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onTogglePart(part.id)}
                className={`group relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-3 pl-4 text-left transition-colors ${
                  selected
                    ? "border-[#5865F2]/40 bg-white/70"
                    : "border-[#dce3ee] bg-[#f8fafe]/60 hover:border-[#b8c4d6] hover:bg-white/70"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-2 left-0 w-1 rounded-r-full bg-[#5865F2] transition-opacity duration-200 ${
                    selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}
                />
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors ${
                    selected
                      ? "border-[#5865F2] bg-[#5865F2] text-white"
                      : "border-[#d2dbe8] bg-[#f0f4fa] text-[#5c5e66]"
                  }`}
                >
                  {selected ? (
                    <CheckIcon className="h-3.5 w-3.5" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#80848e]">
                        {part.category}
                      </span>
                      <span className="mt-0.5 block text-sm font-semibold leading-snug text-[#2e3338]">
                        {part.name}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold text-[#5865F2]">
                      {formatPrice(part.price)}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-[#5c5e66]">
                    {part.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Link
        href="/laptops"
        className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-3.5 py-3 transition-colors hover:border-[#5865F2]/50"
      >
        <span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#80848e]">
            Looking for a laptop?
          </span>
          <span className="mt-0.5 block text-sm font-semibold text-[#2e3338]">
            Browse the laptop collection
          </span>
        </span>
        <span className="text-[#5865F2]">→</span>
      </Link>
    </aside>
  );
}
