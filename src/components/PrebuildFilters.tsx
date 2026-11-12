"use client";

export type PlatformFilter = "all" | "intel" | "amd";
export type RefinementFilter = "all" | "in-stock" | "flagship" | "under-2k";

type Counts = Record<PlatformFilter, number>;

const platforms: { value: PlatformFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "intel", label: "Intel" },
  { value: "amd", label: "AMD" },
];

const refinements: { value: RefinementFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in-stock", label: "In Stock" },
  { value: "flagship", label: "Flagship" },
  { value: "under-2k", label: "Under 2k" },
];

type PrebuildFiltersProps = {
  platform: PlatformFilter;
  refinement: RefinementFilter;
  counts: Counts;
  onPlatformChange: (platform: PlatformFilter) => void;
  onRefinementChange: (refinement: RefinementFilter) => void;
};

const labelClass =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-[#80848e]";

const trackClass =
  "flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden";

export default function PrebuildFilters({
  platform,
  refinement,
  counts,
  onPlatformChange,
  onRefinementChange,
}: PrebuildFiltersProps) {
  return (
    <div className="hidden lg:flex lg:flex-row lg:items-center lg:justify-between lg:gap-6">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <span className={labelClass}>Platform</span>

        <div className={trackClass}>
          {platforms.map((option) => {
            const active = platform === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                aria-label={`${option.label} (${counts[option.value]} items)`}
                onClick={() => onPlatformChange(option.value)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-[#5865F2] bg-[#5865F2] text-white"
                    : "border-[#d2dbe8] bg-[#f8fafe] text-[#2e3338] hover:border-[#b8c4d6] hover:bg-white"
                }`}
              >
                {option.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-[#eaf0f8] text-[#5c5e66]"
                  }`}
                >
                  {counts[option.value]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <span className={labelClass}>Refine</span>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {refinements.map((option) => {
            const active = refinement === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => onRefinementChange(option.value)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  active
                    ? "border-[#5865F2] bg-[#5865F2] text-white"
                    : "border-[#d2dbe8] bg-transparent text-[#5c5e66] hover:border-[#b8c4d6] hover:text-[#2e3338]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
