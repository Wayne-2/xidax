"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { fetchAdminUserStats, fetchAdminUsers, type AdminUser } from "@/lib/admin-api";

export default function AdminUsers() {
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ totalUsers: number; verifiedUsers: number; unverifiedUsers: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [verified, setVerified] = useState("all");
  const [offset, setOffset] = useState(0);
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
      <p className="mt-1 text-sm text-[#5c5e66]">View accounts and their verification status.</p>

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
