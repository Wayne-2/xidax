"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import {
  fetchAdminUserStats,
  fetchAdminUsers,
  verifyAdminUser,
  type AdminUser,
} from "@/lib/admin-api";

export default function AdminUsers() {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ totalUsers: number; verifiedUsers: number; unverifiedUsers: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [verified, setVerified] = useState("all");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, userStats] = await Promise.all([
        fetchAdminUsers({ search, verified, limit: LIMIT, offset }),
        fetchAdminUserStats(),
      ]);
      setUsers(list.users);
      setTotal(list.total);
      setStats(userStats);
    } catch (error) {
      toast.error((error as { error?: string }).error ?? "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, [search, verified, offset, toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">Users</h1>
      <p className="mt-1 text-sm text-[#5c5e66]">View accounts, verification status and activity.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card label="Total users" value={stats?.totalUsers?.toString() ?? "—"} />
        <Card label="Verified" value={stats?.verifiedUsers?.toString() ?? "—"} />
        <Card label="Unverified" value={stats?.unverifiedUsers?.toString() ?? "—"} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          placeholder="Search name or email…"
          className="h-10 min-w-[220px] flex-1 rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm outline-none focus:border-[#5865F2]"
        />
        <select
          value={verified}
          onChange={(e) => { setVerified(e.target.value); setOffset(0); }}
          className="h-10 rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm outline-none focus:border-[#5865F2]"
        >
          <option value="all">All users</option>
          <option value="yes">Verified</option>
          <option value="no">Unverified</option>
        </select>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#dce3ee] bg-white shadow-card">
        {loading ? (
          <div className="p-10 text-center text-sm text-[#5c5e66]">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#5c5e66]">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#e4e9f0] bg-[#f8fafe] text-[11px] uppercase tracking-wide text-[#80848e]">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Verification</th>
                  <th className="px-4 py-3 font-semibold">Orders</th>
                  <th className="px-4 py-3 font-semibold">Products</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-[#eef1f6] last:border-0">
                    <td className="px-4 py-3 font-semibold">{user.name}</td>
                    <td className="px-4 py-3 text-[#5c5e66]">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                        user.emailVerified
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-700"
                      }`}>
                        {user.emailVerified ? "Verified" : "Unverified"}
                      </span>
                      {user.hasPendingOtp && (
                        <span className="ml-2 text-[10px] text-[#80848e]">OTP pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{user.orders}</td>
                    <td className="px-4 py-3 text-center">{user.products}</td>
                    <td className="px-4 py-3 text-xs text-[#5c5e66]">
                      {new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => setSelected(user)} className="text-sm font-semibold text-[#5865F2] hover:text-[#4752C4]">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            className="rounded-lg border border-[#d2dbe8] bg-white px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-[#5c5e66]">Page {currentPage} of {pages}</span>
          <button
            type="button"
            disabled={offset + LIMIT >= total}
            onClick={() => setOffset(offset + LIMIT)}
            className="rounded-lg border border-[#d2dbe8] bg-white px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setSelected(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{selected.name}</h2>
                <p className="mt-1 text-sm text-[#5c5e66]">{selected.email}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#80848e] hover:bg-[#f0f4fa]" aria-label="Close">✕</button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-[#e4e9f0] bg-[#f8fafe] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">Account</p>
                <dl className="mt-2 space-y-1.5 text-sm">
                  <div className="flex justify-between"><dt className="text-[#80848e]">User ID</dt><dd className="max-w-[200px] truncate font-mono text-xs">{selected.id}</dd></div>
                  <div className="flex justify-between"><dt className="text-[#80848e]">Tier</dt><dd className="font-semibold">{selected.tier}</dd></div>
                  <div className="flex justify-between"><dt className="text-[#80848e]">Phone</dt><dd>{selected.phone || "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-[#80848e]">Country</dt><dd>{selected.country || "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-[#80848e]">Postal code</dt><dd>{selected.postalCode || "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-[#80848e]">Joined</dt><dd>{new Date(selected.createdAt).toLocaleDateString()}</dd></div>
                </dl>
              </div>

              <div className="rounded-xl border border-[#e4e9f0] bg-[#f8fafe] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">Activity</p>
                <dl className="mt-2 space-y-1.5 text-sm">
                  <div className="flex justify-between"><dt className="text-[#80848e]">Email status</dt><dd className="font-semibold">{selected.emailVerified ? "Verified" : "Unverified"}</dd></div>
                  <div className="flex justify-between"><dt className="text-[#80848e]">Pending OTP</dt><dd>{selected.hasPendingOtp ? "Yes" : "No"}</dd></div>
                  <div className="flex justify-between"><dt className="text-[#80848e]">Orders</dt><dd>{selected.orders}</dd></div>
                  <div className="flex justify-between"><dt className="text-[#80848e]">Registered products</dt><dd>{selected.products}</dd></div>
                </dl>
              </div>

              {!selected.emailVerified && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await verifyAdminUser(selected.id);
                      toast.success("User marked as verified.");
                      setSelected(null);
                      await load();
                    } catch (error) {
                      toast.error((error as { error?: string }).error ?? "Could not verify user.");
                    }
                  }}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white hover:bg-[#4752C4]"
                >
                  Mark email as verified
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#dce3ee] bg-white p-5 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}
