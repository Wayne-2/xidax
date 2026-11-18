"use client";

import { useState } from "react";
import { generatePromoCode } from "@/lib/admin-api";
import { useToast } from "@/components/ToastProvider";

export type PromoFields = {
  promoCode: string | null;
  promoDiscount: number;
  promoEnabled: boolean;
};

export const EMPTY_PROMO: PromoFields = {
  promoCode: null,
  promoDiscount: 10,
  promoEnabled: false,
};

const inputClass =
  "h-10 w-full rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm outline-none focus:border-[#5865F2]";

/** Admin controls for a product's promo code and percentage discount. */
export default function PromoFieldsInput({
  value,
  onChange,
}: {
  value: PromoFields;
  onChange: (value: PromoFields) => void;
}) {
  const toast = useToast();
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);

    try {
      const result = await generatePromoCode();
      onChange({ ...value, promoCode: result.code, promoEnabled: true });
      toast.success(`Promo code ${result.code} generated.`);
    } catch {
      toast.error("Could not generate a promo code. Enter one manually.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#e4e9f0] bg-[#f8fafe] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
            Promo code
          </p>
          <p className="mt-1 text-xs text-[#80848e]">
            Issued for this product. Customers enter it at checkout.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-[#5c5e66]">
          <input
            type="checkbox"
            checked={value.promoEnabled}
            onChange={(e) => onChange({ ...value, promoEnabled: e.target.checked })}
            className="h-4 w-4 accent-[#5865F2]"
          />
          Active
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={value.promoCode ?? ""}
          onChange={(e) =>
            onChange({ ...value, promoCode: e.target.value.trim().toUpperCase() || null })
          }
          placeholder="PCM-ABC123"
          className={`${inputClass} min-w-[160px] flex-1 font-mono`}
        />
        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="inline-flex h-10 items-center rounded-xl border border-[#5865F2]/40 bg-white px-4 text-sm font-semibold text-[#4752C4] hover:bg-[#5865F2]/10 disabled:opacity-50"
        >
          {generating ? "Generating…" : "Generate"}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <label className="shrink-0 text-xs font-semibold text-[#5c5e66]">
          Discount (%)
        </label>
        <input
          type="number"
          min="1"
          max="100"
          value={value.promoDiscount || ""}
          onChange={(e) => onChange({ ...value, promoDiscount: Number(e.target.value) })}
          className={inputClass}
        />
        <span className="shrink-0 text-xs text-[#80848e]">
          e.g. 10 = 10% off
        </span>
      </div>
    </div>
  );
}
