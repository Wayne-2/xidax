"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import {
  fetchAdminGiveaway,
  updateAdminGiveawayClosing,
  updateAdminGiveawayPrize,
  uploadProductImage,
  type AdminGiveawayStatus,
} from "@/lib/admin-api";

export default function AdminGiveaway() {
  const toast = useToast();
  const [status, setStatus] = useState<AdminGiveawayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [closesAtInput, setClosesAtInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [prizeName, setPrizeName] = useState("");
  const [prizeDescription, setPrizeDescription] = useState("");
  const [prizeImages, setPrizeImages] = useState<string[]>([]);
  const [prizeSpecs, setPrizeSpecs] = useState<{ label: string; value: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [savingPrize, setSavingPrize] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await fetchAdminGiveaway();
      setStatus(result);
      setClosesAtInput(
        result.closesAt ? new Date(result.closesAt).toISOString().slice(0, 16) : ""
      );
      setPrizeName(result.prize?.name ?? "");
      setPrizeDescription(result.prize?.description ?? "");
      setPrizeImages(result.prize?.images ?? []);
      setPrizeSpecs(result.prize?.specs ?? []);
    } catch {
      // Keep the panel neutral when the status cannot be loaded.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);

    return () => window.clearTimeout(timer);
  }, [load]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();

    if (saving || loading) return;
    if (!closesAtInput) {
      toast.error("Pick a closing time for the giveaway.");
      return;
    }

    setSaving(true);

    try {
      const result = await updateAdminGiveawayClosing(new Date(closesAtInput).toISOString());
      setStatus(result.status);
      toast.success("Giveaway closing time updated.");
    } catch (error) {
      const payload = error as { error?: string };
      toast.error(payload.error ?? "Could not update the giveaway closing time.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseNow() {
    if (saving || loading) return;

    setSaving(true);

    try {
      const result = await updateAdminGiveawayClosing(
        new Date(Date.now() - 1000).toISOString()
      );
      setStatus(result.status);
      toast.success("Giveaway closed.");
    } catch (error) {
      const payload = error as { error?: string };
      toast.error(payload.error ?? "Could not close the giveaway.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePrizeImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, 12);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const result = await uploadProductImage(file);
        uploaded.push(result.url);
      }
      setPrizeImages((prev) => [...prev, ...uploaded].slice(0, 12));
      toast.success("Prize image uploaded.");
    } catch (error) {
      toast.error((error as { error?: string }).error ?? "Could not upload image.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function handleSavePrize(event: React.FormEvent) {
    event.preventDefault();
    if (savingPrize || loading) return;

    const specs = prizeSpecs.map((s) => ({ label: s.label.trim().slice(0,80), value: s.value.trim().slice(0,160) })).filter((s) => s.label && s.value).slice(0,12);
    const payload = {
      name: prizeName.trim().slice(0, 200),
      description: prizeDescription.trim().slice(0, 1000),
      images: prizeImages,
      specs,
    };

    if (!payload.name && !payload.description && payload.images.length === 0 && payload.specs.length === 0) {
      toast.error("Add a prize name, image, or spec before saving.");
      return;
    }

    setSavingPrize(true);
    try {
      const result = await updateAdminGiveawayPrize(payload);
      setStatus(result.status);
      toast.success("Giveaway prize saved.");
    } catch (error) {
      const e = error as { error?: string; message?: string; status?: number };
      console.error("save giveaway prize failed", error);
      toast.error(e.error || e.message || "Could not save prize.");
    } finally {
      setSavingPrize(false);
    }
  }

  async function handleClearPrize() {
    if (savingPrize || loading) return;
    setSavingPrize(true);
    try {
      const result = await updateAdminGiveawayPrize(null);
      setStatus(result.status);
      setPrizeName("");
      setPrizeDescription("");
      setPrizeImages([]);
      setPrizeSpecs([]);
      toast.success("Giveaway prize cleared.");
    } catch (error) {
      toast.error((error as { error?: string }).error ?? "Could not clear prize.");
    } finally {
      setSavingPrize(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#dce3ee] bg-white p-5 shadow-card sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#2e3338]">Giveaway</h2>
          <p className="mt-2 max-w-2xl text-sm text-[#5c5e66]">
            Manage the free custom gaming PC giveaway. Set the closing timer,
            then post entries — the storefront countdown picks it up live.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
            status?.closed
              ? "bg-[#DC2626]/10 text-[#B91C1C]"
              : "bg-[#15803D]/10 text-[#15803D]"
          }`}
        >
          {loading ? "Loading…" : status?.closed ? "Closed" : "Open"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#dce3ee] bg-[#f8fafe] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
            Entries
          </p>
          <p className="mt-2 text-2xl font-extrabold text-[#2e3338]">
            {status?.totalEntries ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-[#dce3ee] bg-[#f8fafe] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
            Closing
          </p>
          <p className="mt-2 text-sm font-semibold text-[#2e3338]">
            {status?.closesAt ? new Date(status.closesAt).toLocaleString() : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-[#dce3ee] bg-[#f8fafe] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
            Your entry
          </p>
          <p className="mt-2 text-sm font-semibold text-[#2e3338]">
            {status?.entered ? "Entered" : "Not entered"}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="mt-6 rounded-2xl border border-[#dce3ee] bg-[#f8fafe] p-5"
      >
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
            Giveaway closes at
          </span>
          <input
            type="datetime-local"
            value={closesAtInput}
            onChange={(event) => setClosesAtInput(event.target.value)}
            disabled={saving || loading}
            className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-white px-3.5 text-sm outline-none focus:border-[#5865F2] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || loading}
            className="inline-flex h-11 items-center rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save closing time"}
          </button>
          <button
            type="button"
            onClick={handleCloseNow}
            disabled={saving || loading}
            className="inline-flex h-11 items-center rounded-xl border border-[#d2dbe8] bg-white px-5 text-sm font-semibold text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Close now
          </button>
        </div>
      </form>

      <form onSubmit={handleSavePrize} className="mt-6 rounded-2xl border border-[#dce3ee] bg-[#f8fafe] p-5">
        <h3 className="text-sm font-bold text-[#2e3338]">Giveaway prize</h3>
        <p className="mt-1 text-xs text-[#5c5e66]">This is shown in the storefront prize section.</p>

        <div className="mt-4 grid gap-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">Prize name</span>
            <input value={prizeName} onChange={(e) => setPrizeName(e.target.value)} disabled={savingPrize || loading} className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-white px-3.5 text-sm outline-none focus:border-[#5865F2] disabled:opacity-60" placeholder="Custom Gaming PC" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">Description</span>
            <textarea value={prizeDescription} onChange={(e) => setPrizeDescription(e.target.value)} disabled={savingPrize || loading} rows={3} className="w-full rounded-xl border border-[#d2dbe8] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#5865F2] disabled:opacity-60" placeholder="Describe the prize..." />
          </label>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">Specs</span>
              <button type="button" onClick={() => setPrizeSpecs((p) => [...p, { label: "", value: "" }].slice(0,12))} className="text-xs font-semibold text-[#5865F2] hover:underline">+ Add spec</button>
            </div>
            <div className="space-y-2">
              {prizeSpecs.map((spec, idx) => (
                <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input value={spec.label} onChange={(e) => setPrizeSpecs((p) => p.map((s,i)=> i===idx ? {...s, label: e.target.value} : s))} placeholder="Label (e.g. GPU)" className="h-10 rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm outline-none focus:border-[#5865F2]" />
                  <input value={spec.value} onChange={(e) => setPrizeSpecs((p) => p.map((s,i)=> i===idx ? {...s, value: e.target.value} : s))} placeholder="Value (e.g. RTX 4070)" className="h-10 rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm outline-none focus:border-[#5865F2]" />
                  <button type="button" onClick={() => setPrizeSpecs((p) => p.filter((_,i)=>i!==idx))} className="h-10 rounded-xl border border-[#d2dbe8] px-3 text-xs font-semibold text-[#B91C1C]">Remove</button>
                </div>
              ))}
              {prizeSpecs.length === 0 && <p className="text-xs text-[#80848e]">No specs added yet.</p>}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">Prize images</span>
            <input type="file" accept="image/*" multiple onChange={handlePrizeImages} disabled={uploading || savingPrize || loading} className="block w-full text-sm text-[#5c5e66] file:mr-3 file:rounded-lg file:border-0 file:bg-[#5865F2]/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#5865F2]" />
          </label>
          {prizeImages.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {prizeImages.map((src, idx) => (
                <div key={`${src}-${idx}`} className="relative overflow-hidden rounded-xl border border-[#dce3ee] bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Prize image ${idx + 1}`} className="aspect-square w-full object-contain" />
                  <button type="button" onClick={() => setPrizeImages((prev) => prev.filter((_, i) => i !== idx))} className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-[#B91C1C] shadow">Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="submit" disabled={savingPrize || uploading || loading} className="inline-flex h-11 items-center rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-60">
            {savingPrize ? "Saving…" : uploading ? "Uploading…" : "Save prize"}
          </button>
          <button type="button" onClick={handleClearPrize} disabled={savingPrize || uploading || loading} className="inline-flex h-11 items-center rounded-xl border border-[#d2dbe8] bg-white px-5 text-sm font-semibold text-[#5c5e66] transition-colors hover:border-[#DC2626]/40 hover:text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-60">
            Clear prize
          </button>
        </div>
      </form>
    </section>
  );
}
