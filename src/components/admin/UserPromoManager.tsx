"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import {
  assignUserPromo,
  deleteUserPromo,
  fetchUserPromo,
  generateUserPromoCode,
  setUserPromoActive,
  type UserPromo,
} from "@/lib/admin-api";

const inputClass =
  "h-10 w-full rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm outline-none focus:border-[#5865F2]";

/** Admin controls for the promo assigned to one user. */
export default function UserPromoManager({ uid }: { uid: string }) {
  const toast = useToast();
  const [promo, setPromo] = useState<UserPromo | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(10);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchUserPromo(uid);
      setPromo(result.promo);
      setCode(result.promo?.code ?? "");
      setDiscount(result.promo?.discount ?? 10);
    } catch {
      // The parent surfaces API errors; keep the form usable.
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save() {
    if (!code.trim()) {
      toast.error("Enter a promo code.");
      return;
    }

    setSaving(true);

    try {
      const result = await assignUserPromo(uid, code, discount);
      setPromo(result.promo);
      toast.success("Promo assigned to user.");
    } catch (error) {
      toast.error((error as { error?: string }).error ?? "Could not assign promo.");
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    setGenerating(true);

    try {
      const result = await generateUserPromoCode();
      setCode(result.code);
      toast.success(`Generated ${result.code}. Click Save to assign it.`);
    } catch {
      toast.error("Could not generate a code.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <p className="text-xs text-[#80848e]">Loading promo…</p>;
  }

  return (
    <div className="rounded-xl border border-[#e4e9f0] bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">
            User promo code
          </p>
          <p className="mt-1 text-xs text-[#80848e]">
            Applies to every purchase this user makes.
          </p>
        </div>
        {promo && (
          <button
            type="button"
            onClick={async () => {
              try {
                await setUserPromoActive(uid, !promo.active);
                toast.success(promo.active ? "Promo disabled." : "Promo enabled.");
                await load();
              } catch {
                toast.error("Could not update promo.");
              }
            }}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              promo.active
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                : "border-slate-500/30 bg-slate-500/10 text-slate-600"
            }`}
          >
            {promo.active ? "Active" : "Disabled"}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="PCM-ABC123"
          className={`${inputClass} min-w-[140px] flex-1 font-mono`}
        />
        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="inline-flex h-10 items-center rounded-xl border border-[#5865F2]/40 px-3 text-xs font-semibold text-[#4752C4] hover:bg-[#5865F2]/10 disabled:opacity-50"
        >
          {generating ? "…" : "Generate"}
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <label className="shrink-0 text-xs font-semibold text-[#5c5e66]">
          Discount %
        </label>
        <input
          type="number"
          min="1"
          max="100"
          value={discount || ""}
          onChange={(e) => setDiscount(Number(e.target.value))}
          className={inputClass}
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex h-10 shrink-0 items-center rounded-xl bg-[#5865F2] px-4 text-xs font-semibold text-white hover:bg-[#4752C4] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {promo && (
        <button
          type="button"
          onClick={async () => {
            if (!window.confirm(`Remove promo ${promo.code} from this user?`)) return;

            try {
              await deleteUserPromo(uid);
              toast.success("Promo removed.");
              setPromo(null);
              setCode("");
            } catch {
              toast.error("Could not remove promo.");
            }
          }}
          className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700"
        >
          Remove promo
        </button>
      )}
    </div>
  );
}
