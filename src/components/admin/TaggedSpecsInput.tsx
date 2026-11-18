"use client";

import { useState } from "react";
import { SPEC_TAGS, type ProductKind } from "@/data/spec-tags";

export type Spec = { label: string; value: string };

/** Admin input for product specifications: pick a standard tag, enter its value. */
export default function TaggedSpecsInput({
  kind,
  specs,
  onChange,
}: {
  kind: ProductKind;
  specs: Spec[];
  onChange: (specs: Spec[]) => void;
}) {
  const tags = SPEC_TAGS[kind];
  const [tag, setTag] = useState("");
  const [value, setValue] = useState("");

  const used = new Set(specs.map((spec) => spec.label));
  const available = tags.filter((item) => !used.has(item.label));

  function add() {
    if (!tag || !value.trim()) return;

    onChange([...specs, { label: tag, value: value.trim() }]);
    setTag("");
    setValue("");
  }

  return (
    <div className="rounded-xl border border-[#e4e9f0] bg-[#f8fafe] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
          Specifications
        </p>
        <span className="text-[11px] text-[#80848e]">{specs.length} set</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="h-10 min-w-[160px] flex-1 rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm outline-none focus:border-[#5865F2]"
        >
          <option value="">Select a spec tag…</option>
          {available.map((item) => (
            <option key={item.label} value={item.label}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={
            tags.find((item) => item.label === tag)?.placeholder ||
            "Enter the specific detail"
          }
          className="h-10 min-w-[200px] flex-[2] rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm outline-none focus:border-[#5865F2]"
        />
        <button
          type="button"
          onClick={add}
          disabled={!tag || !value.trim()}
          className="inline-flex h-10 items-center rounded-xl bg-[#5865F2] px-4 text-sm font-semibold text-white hover:bg-[#4752C4] disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {specs.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {specs.map((spec, index) => (
            <div
              key={`${spec.label}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-[#d2dbe8] bg-white px-3 py-2 text-sm"
            >
              <span className="shrink-0 rounded-full bg-[#5865F2]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#4752C4]">
                {spec.label}
              </span>
              <span className="min-w-0 flex-1 truncate text-[#2e3338]">
                {spec.value}
              </span>
              <button
                type="button"
                aria-label={`Remove ${spec.label}`}
                onClick={() => onChange(specs.filter((_, i) => i !== index))}
                className="shrink-0 text-red-600 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
