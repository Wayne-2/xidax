"use client";

import { useEffect, useState } from "react";
import { fetchAdminConfig, updateAdminConfig } from "@/lib/admin-api";

export default function AdminSettings() {
  const [supportEmail, setSupportEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const config = await fetchAdminConfig();
        if (!cancelled) setSupportEmail(config.supportEmail);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await updateAdminConfig({ supportEmail });
      setSupportEmail(result.supportEmail);
      setMessage("Support email updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2e3338]">Settings</h1>
        <p className="mt-1 text-sm text-[#5c5e66]">Manage operational notification settings.</p>
      </div>

      <div className="rounded-2xl border border-[#dce3ee] bg-white p-5 shadow-card">
        <h2 className="text-sm font-semibold text-[#2e3338]">Support notification email</h2>
        <p className="mt-1 text-sm text-[#5c5e66]">This address receives checkout, payment, order, and support notifications.</p>
        <div className="mt-4 max-w-xl">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">Support email</label>
          <input
            type="email"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            disabled={loading || saving}
            placeholder="supportsgenericpcs@gmail.com"
            className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-3.5 text-sm outline-none focus:border-[#5865F2] disabled:opacity-60"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {message && <p className="mt-2 text-sm text-emerald-600">{message}</p>}
          <button
            type="button"
            onClick={() => void save()}
            disabled={loading || saving || !supportEmail.trim()}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white hover:bg-[#4752C4] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>
    </section>
  );
}
