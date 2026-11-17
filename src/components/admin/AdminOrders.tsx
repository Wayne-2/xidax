"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import {
  fetchAdminOrderStats,
  fetchAdminOrders,
  updateAdminOrderStatus,
  type AdminOrder,
  type AdminOrderStats,
} from "@/lib/admin-api";

const ORDER_STATUSES = [
  "all",
  "pending",
  "awaiting_payment",
  "submitted",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "expired",
  "failed",
  "cancelled",
  "refunded",
];

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  delivered: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  awaiting_payment: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  submitted: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  processing: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  shipped: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30",
  expired: "bg-slate-500/10 text-slate-600 border-slate-500/30",
  failed: "bg-red-500/10 text-red-700 border-red-500/30",
  cancelled: "bg-red-500/10 text-red-700 border-red-500/30",
  refunded: "bg-red-500/10 text-red-700 border-red-500/30",
};

function prettyStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function money(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}

export default function AdminOrders() {
  const toast = useToast();
  const [stats, setStats] = useState<AdminOrderStats | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, orderStats] = await Promise.all([
        fetchAdminOrders({ status: statusFilter, search, limit: LIMIT, offset }),
        fetchAdminOrderStats(),
      ]);
      setOrders(list.orders);
      setTotal(list.total);
      setStats(orderStats);
    } catch (error) {
      toast.error((error as { error?: string }).error ?? "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, offset, toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function handleStatusChange(order: AdminOrder, newStatus: string) {
    try {
      await updateAdminOrderStatus(order.id, newStatus);
      toast.success(`Order ${order.reference} marked ${prettyStatus(newStatus).toLowerCase()}.`);
      setSelected(null);
      await load();
    } catch (error) {
      toast.error((error as { error?: string }).error ?? "Could not update order.");
    }
  }

  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">Orders</h1>
      <p className="mt-1 text-sm text-[#5c5e66]">Track and manage customer orders.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card label="Total orders" value={stats?.totalOrders?.toString() ?? "—"} />
        <Card label="Revenue" value={stats ? money(stats.revenue) : "—"} />
        <Card label="Awaiting payment" value={stats?.byStatus?.find((s) => s.status === "awaiting_payment")?.count?.toString() ?? "0"} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}
          className="h-10 rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm outline-none focus:border-[#5865F2]"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All statuses" : prettyStatus(s)}</option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          placeholder="Search email, name, reference…"
          className="h-10 min-w-[220px] flex-1 rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm outline-none focus:border-[#5865F2]"
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#dce3ee] bg-white shadow-card">
        {loading ? (
          <div className="p-10 text-center text-sm text-[#5c5e66]">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#5c5e66]">No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#e4e9f0] bg-[#f8fafe] text-[11px] uppercase tracking-wide text-[#80848e]">
                  <th className="px-4 py-3 font-semibold">Reference</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-[#eef1f6] last:border-0">
                    <td className="px-4 py-3 font-semibold">{order.reference}</td>
                    <td className="px-4 py-3">
                      <p>{order.name}</p>
                      <p className="text-xs text-[#80848e]">{order.email}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold">{money(order.total, order.currency)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[order.status] ?? "bg-slate-500/10 text-slate-600 border-slate-500/30"}`}>
                        {prettyStatus(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#5c5e66]">
                      {new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => setSelected(order)} className="text-sm font-semibold text-[#5865F2] hover:text-[#4752C4]">
                        View
                      </button>
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
          <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))} className="rounded-lg border border-[#d2dbe8] bg-white px-3 py-1.5 disabled:opacity-40">
            Previous
          </button>
          <span className="text-[#5c5e66]">Page {currentPage} of {pages}</span>
          <button type="button" disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)} className="rounded-lg border border-[#d2dbe8] bg-white px-3 py-1.5 disabled:opacity-40">
            Next
          </button>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setSelected(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{selected.reference}</h2>
                <p className="mt-1 text-xs text-[#80848e]">{new Date(selected.createdAt).toLocaleString()}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#80848e] hover:bg-[#f0f4fa]" aria-label="Close">✕</button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-[#e4e9f0] bg-[#f8fafe] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">Customer</p>
                <p className="mt-1 font-semibold">{selected.name}</p>
                <p className="text-sm text-[#5c5e66]">{selected.email}</p>
                {selected.phone && <p className="text-sm text-[#5c5e66]">{selected.phone}</p>}
              </div>

              <div className="rounded-xl border border-[#e4e9f0] bg-[#f8fafe] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">Items</p>
                <div className="mt-2 space-y-2">
                  {selected.lines.map((line) => (
                    <div key={line.id} className="flex justify-between text-sm">
                      <span>{line.quantity} × {line.name}</span>
                      <span className="font-semibold">{money(line.price * line.quantity, selected.currency)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-1 border-t border-[#e4e9f0] pt-3 text-sm">
                  <div className="flex justify-between text-[#5c5e66]"><span>Subtotal</span><span>{money(selected.subtotal, selected.currency)}</span></div>
                  <div className="flex justify-between text-[#5c5e66]"><span>Shipping</span><span>{money(selected.shipping, selected.currency)}</span></div>
                  <div className="flex justify-between font-bold"><span>Total</span><span>{money(selected.total, selected.currency)}</span></div>
                </div>
              </div>

              <div className="rounded-xl border border-[#e4e9f0] bg-[#f8fafe] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">Payment</p>
                <p className="mt-1 text-sm">Method: <span className="font-semibold">{selected.method}</span></p>
                {selected.network && <p className="text-sm">Network: <span className="font-semibold">{selected.network}</span></p>}
                <p className="text-sm">Status: <span className="font-semibold">{prettyStatus(selected.status)}</span></p>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">Update status</p>
                <div className="flex flex-wrap gap-2">
                  {ORDER_STATUSES.filter((s) => s !== "all").map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleStatusChange(selected, s)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        selected.status === s
                          ? "border-[#5865F2] bg-[#5865F2] text-white"
                          : "border-[#d2dbe8] bg-white text-[#5c5e66] hover:border-[#5865F2]/50"
                      }`}
                    >
                      {prettyStatus(s)}
                    </button>
                  ))}
                </div>
              </div>
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
