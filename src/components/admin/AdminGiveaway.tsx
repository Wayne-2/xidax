"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import {
  fetchAdminGiveaway,
  updateAdminGiveawayClosing,
  type AdminGiveawayStatus,
} from "@/lib/admin-api";

export default function AdminGiveaway() {
  const toast = useToast();
  const [status, setStatus] = useState<AdminGiveawayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [closesAtInput, setClosesAtInput] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await fetchAdminGiveaway();
      setStatus(result);
      setClosesAtInput(
        result.closesAt ? new Date(result.closesAt).toISOString().slice(0, 16) : ""
      );
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
    </section>
  );
}
