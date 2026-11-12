"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { BuildModel, BuildModelId } from "@/data/customBuild";
import {
  CheckIcon,
  ChevronDownIcon,
  DesktopIcon,
  LaptopIcon,
} from "@/components/BuildIcons";

type BuildModelSelectProps = {
  models: BuildModel[];
  value: BuildModelId;
  onChange: (modelId: BuildModelId) => void;
};

export default function BuildModelSelect({
  models,
  value,
  onChange,
}: BuildModelSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const triggerId = useId();
  const labelId = useId();
  const listboxId = useId();
  const descriptionId = useId();

  const activeModel =
    models.find((model) => model.id === value) ?? models[0];
  const selectedIndex = Math.max(
    0,
    models.findIndex((model) => model.id === value)
  );
  const isLaptop = activeModel.id.includes("laptop");

  useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => {
      optionRefs.current[selectedIndex]?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const selectModel = (modelId: BuildModelId) => {
    onChange(modelId);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerClick = () => {
    if (open) {
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }

    setOpen(true);
  };

  const handleTriggerKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>
  ) => {
    if (
      event.key === "ArrowDown" ||
      event.key === "ArrowUp" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      setOpen(true);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const handleOptionKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = (index + 1) % models.length;
      setActiveIndex(next);
      optionRefs.current[next]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = (index - 1 + models.length) % models.length;
      setActiveIndex(next);
      optionRefs.current[next]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      optionRefs.current[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      const next = models.length - 1;
      setActiveIndex(next);
      optionRefs.current[next]?.focus();
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectModel(models[index].id);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div>
      <label
        id={labelId}
        htmlFor={triggerId}
        className="block cursor-pointer text-[11px] font-semibold uppercase tracking-[0.2em] text-[#80848e]"
      >
        Model
      </label>

      <div ref={containerRef} className="relative mt-2">
        <button
          ref={triggerRef}
          id={triggerId}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-describedby={descriptionId}
          aria-controls={open ? listboxId : undefined}
          onClick={handleTriggerClick}
          onKeyDown={handleTriggerKeyDown}
          className={`group flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all focus-visible:border-[#5865F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2]/20 ${
            open
              ? "border-[#5865F2] bg-white shadow-[0_0_0_3px_rgba(88,101,242,0.12)]"
              : "border-[#d2dbe8] bg-[#f8fafe] hover:border-[#b8c4d6] hover:bg-white"
          }`}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                open
                  ? "bg-[#5865F2] text-white"
                  : "bg-[#5865F2]/10 text-[#5865F2]"
              }`}
            >
              {isLaptop ? (
                <LaptopIcon className="h-4 w-4" />
              ) : (
                <DesktopIcon className="h-4 w-4" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[#2e3338]">
                {activeModel.label}
              </span>
              <span className="mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[#80848e]">
                {isLaptop ? "Laptop model" : "Desktop model"}
              </span>
            </span>
          </span>
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all ${
              open
                ? "rotate-180 bg-[#5865F2]/10 text-[#5865F2]"
                : "bg-[#f0f4fa] text-[#5c5e66] group-hover:text-[#2e3338]"
            }`}
          >
            <ChevronDownIcon className="h-4 w-4" />
          </span>
        </button>

        {open && (
          <div
            id={listboxId}
            role="listbox"
            aria-labelledby={labelId}
            className="animate-dropdown-in absolute inset-x-0 z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-[#d2dbe8] bg-white p-1.5 shadow-[0_18px_40px_-12px_rgba(46,51,56,0.28)] [scrollbar-width:thin]"
          >
            {models.map((model, index) => {
              const selected = model.id === value;
              const active = index === activeIndex;

              return (
                <button
                  key={model.id}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  tabIndex={-1}
                  onClick={() => selectModel(model.id)}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                  onFocus={() => setActiveIndex(index)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors focus:outline-none ${
                    selected
                      ? "bg-[#5865F2]/10"
                      : active
                        ? "bg-[#f0f4fa]"
                        : "bg-transparent hover:bg-[#f0f4fa]"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      selected
                        ? "border-[#5865F2] bg-[#5865F2] text-white"
                        : "border-[#d2dbe8] bg-[#f8fafe] text-transparent"
                    }`}
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm font-semibold ${
                        selected ? "text-[#5865F2]" : "text-[#2e3338]"
                      }`}
                    >
                      {model.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-[#5c5e66]">
                      {model.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p
        id={descriptionId}
        className="mt-2 text-xs leading-relaxed text-[#5c5e66] sr-only lg:not-sr-only"
      >
        {activeModel.description}
      </p>
    </div>
  );
}
