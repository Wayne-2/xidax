"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { useAccount } from "@/components/AccountProvider";
import {
  addAdmin,
  fetchAdmins,
  removeAdmin,
  type AdminEntry,
} from "@/lib/admin-api";

export default function AdminAdmins() {
  const toast = useToast();
  const { user } = useAccount();
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdmins();
      setAdmins(result.admins);
    } catch (error) {
      toast.error((error as { error?: string }).error ?? "Could not load admins.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;

    setAdding(true);
    try {
      const result = await addAdmin(email.trim());
      toast.success(`${result.email} can now access the admin dashboard.`);
      setEmail("");
      await load();
    } catch (error) {
      toast.error((error as { error?: string }).error ?? "Could not add admin.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(entry: AdminEntry) {
    if (!window.confirm(`Remove admin access for ${entry.email}?`)) return;

    try {
      await removeAdmin(entry.email);
      toast.success(`Removed admin access for ${entry.email}.`);
      await load();
    } catch (error) {
      toast.error((error as { error?: string }).error ?? "Could not remove admin.");
    }
  }

  const currentEmail = user?.email?.toLowerCase();

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">Admins</h1>
      <p className="mt-1 text-sm text-[#5c5e66]">
        Manage who can access this dashboard. Changes take effect immediately — no re-login required.
      </p>

      <form
        onSubmit={handleAdd}
        className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-[#dce3ee] bg-white p-5 shadow-card"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          className="h-11 min-w-[240px] flex-1 rounded-xl border border-[#d2dbe8] bg-white px-3.5 text-sm outline-none focus:border-[#5865F2]"
        />
        <button
          type="submit"
          disabled={adding || !email.trim()}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#5865F2] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4] disabled:opacity-50"
        >
          {adding ? "Adding…" : "Add admin"}
        </button>
      </form>

      <p className="mt-3 text-xs text-[#80848e]">
        The email must already have an account on the site. If they haven&apos;t signed up yet, ask them to sign up first.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#dce3ee] bg-white shadow-card">
        {loading ? (
          <div className="p-10 text-center text-sm text-[#5c5e66]">Loading admins…</div>
        ) : admins.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#5c5e66]">No admins yet.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#e4e9f0] bg-[#f8fafe] text-[11px] uppercase tracking-wide text-[#80848e]">
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {admins.map((entry) => (
                <tr key={entry.email} className="border-b border-[#eef1f6] last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {entry.email}
                    {entry.email.toLowerCase() === currentEmail && (
                      <span className="ml-2 rounded-full bg-[#5865F2]/10 px-2 py-0.5 text-[10px] font-semibold text-[#4752C4]">You</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#5c5e66]">
                    {new Date(entry.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(entry)}
                      disabled={entry.email.toLowerCase() === currentEmail || admins.length <= 1}
                      className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
