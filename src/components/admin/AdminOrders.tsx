"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import {
  fetchAdminOrder,
  fetchAdminOrderStats,
  fetchAdminOrders,
  submitWireDetails,
  updateAdminOrderStatus,
  type AdminOrder,
  type AdminOrderStats,
} from "@/lib/admin-api";

const ORDER_STATUSES = [
  "all",
  "pending",
  "awaiting_payment",
  "awaiting_admin",
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
  awaiting_admin: "bg-orange-500/10 text-orange-700 border-orange-500/30",
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
  const code = /^[A-Za-z]{3}$/.test(currency ?? "") ? currency.toUpperCase() : "USD";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number.isFinite(amount) ? amount : 0);
  }
}

export default function AdminOrders() {
  const toast = useToast();
  const [stats, setStats] = useState<AdminOrderStats | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [wireDraft, setWireDraft] = useState({
    bankName: "",
    accountNumber: "",
    beneficiary: "",
    routing: "",
    swift: "",
  });
  const [savingWire, setSavingWire] = useState(false);
  const LIMIT = 20;

  const loadStats = useCallback(async () => {
    try {
      const orderStats = await fetchAdminOrderStats();
      setStats(orderStats);
    } catch {
      // The list will surface the error; stats are secondary.
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadStats(), 0);
    return () => window.clearTimeout(timer);
  }, [loadStats]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchAdminOrders({ status: statusFilter, search, limit: LIMIT, offset });
      setOrders(list.orders);
      setTotal(list.total);
    } catch (err) {
      const message = (err as { error?: string }).error ?? "Could not load orders.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, offset, toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function refreshOrder(order: AdminOrder) {
    try {
      const [fresh] = await Promise.all([
        fetchAdminOrder(order.id),
        loadStats(),
      ]);
      setSelected(fresh);
    } catch {
      await load();
    }
  }

  async function handleStatusChange(order: AdminOrder, newStatus: string) {
    if (pendingStatus || order.status === newStatus) return;

    setPendingStatus(order.id);

    try {
      await updateAdminOrderStatus(order.id, newStatus);
      toast.success(`Order ${order.reference} marked ${prettyStatus(newStatus).toLowerCase()}.`);
      setSelected(null);
      await load();
    } catch (err) {
      toast.error((err as { error?: string }).error ?? "Could not update order.");
    } finally {
      setPendingStatus(null);
    }
  }

  async function handleWireDetails(order: AdminOrder) {
    if (savingWire) return;

    if (
      !wireDraft.bankName.trim() ||
      !wireDraft.accountNumber.trim() ||
      !wireDraft.beneficiary.trim()
    ) {
      toast.error("Bank name, account number and beneficiary are required.");
      return;
    }

    setSavingWire(true);
    try {
      await submitWireDetails(order.id, {
        bankName: wireDraft.bankName.trim(),
        accountNumber: wireDraft.accountNumber.trim(),
        beneficiary: wireDraft.beneficiary.trim(),
        routing: wireDraft.routing.trim() || undefined,
        swift: wireDraft.swift.trim() || undefined,
        reference: order.reference,
      });
      toast.success("Bank details sent to the customer.");
      await refreshOrder(order);
      await load();
    } catch (err) {
      toast.error((err as { error?: string }).error ?? "Could not send bank details.");
    } finally {
      setSavingWire(false);
    }
  }

  function openOrder(order: AdminOrder) {
    setSelected(order);
    setWireDraft({
      bankName: order.wireDetails?.bankName ?? "",
      accountNumber: order.wireDetails?.accountNumber ?? "",
      beneficiary: order.wireDetails?.beneficiary ?? "",
      routing: order.wireDetails?.routing ?? "",
      swift: order.wireDetails?.swift ?? "",
    });
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
        <Card label="Awaiting review" value={stats ? (stats.byStatus?.find((s) => s.status === "submitted")?.count?.toString() ?? "0") : "—"} />
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
        {error ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-[#B91C1C]">Could not load orders.</p>
            <p className="mt-1 text-sm text-[#5c5e66]">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 inline-flex h-10 items-center rounded-lg bg-[#5865F2] px-5 text-sm font-semibold text-white hover:bg-[#4752C4]"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="p-10 text-center text-sm text-[#5c5e66]">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-[#2e3338]">No orders found.</p>
            <p className="mt-1 text-sm text-[#5c5e66]">Try adjusting the filters or search.</p>
          </div>
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
                      <button type="button" onClick={() => openOrder(order)} className="text-sm font-semibold text-[#5865F2] hover:text-[#4752C4]">
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
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void refreshOrder(selected)}
                  className="flex h-8 items-center rounded-lg px-2 text-xs font-semibold text-[#5865F2] hover:bg-[#5865F2]/10"
                  aria-label="Refresh order"
                >
                  Refresh
                </button>
                <button type="button" onClick={() => setSelected(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#80848e] hover:bg-[#f0f4fa]" aria-label="Close">✕</button>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-[#e4e9f0] bg-[#f8fafe] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">Customer</p>
                <p className="mt-1 font-semibold">{selected.name}</p>
                <p className="text-sm text-[#5c5e66]">{selected.email}</p>
                {selected.phone && <p className="text-sm text-[#5c5e66]">{selected.phone}</p>}
                {selected.country && <p className="text-sm text-[#5c5e66]">{selected.country}</p>}
                <p className="mt-2 break-all font-mono text-[10px] text-[#80848e]">ID: {selected.id}</p>
              </div>

              <div className="rounded-xl border border-[#e4e9f0] bg-[#f8fafe] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">Items</p>
                <div className="mt-2 space-y-2">
                  {selected.lines.length === 0 && (
                    <p className="text-sm text-[#80848e]">No line items recorded.</p>
                  )}
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
                {selected.expiresAt && (
                  <p className="mt-1 text-xs text-[#5c5e66]">
                    Expires: {new Date(selected.expiresAt).toLocaleString()}
                  </p>
                )}
                {selected.cardSummary && (
                  <div className="mt-3 border-t border-[#e4e9f0] pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">Card (masked)</p>
                    <p className="mt-1 font-mono text-sm font-semibold">
                      {selected.cardSummary.brand} ···· {selected.cardSummary.last4}
                    </p>
                    <p className="text-xs text-[#5c5e66]">
                      Exp {selected.cardSummary.expMonth}/{selected.cardSummary.expYear} ·{" "}
                      {selected.cardSummary.holderName}
                    </p>
                  </div>
                )}
                {selected.walletLabel && (
                  <div className="mt-3 border-t border-[#e4e9f0] pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">Crypto wallet</p>
                    <p className="mt-1 text-sm font-semibold">{selected.walletLabel}</p>
                  </div>
                )}
                {selected.receiptSentAt && (
                  <p className="mt-2 text-xs text-[#15803D]">
                    Receipt sent {new Date(selected.receiptSentAt).toLocaleString()}
                  </p>
                )}
              </div>

              {selected.method === "wire" && (
                <div className="rounded-xl border border-[#e4e9f0] bg-[#f8fafe] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">
                    {selected.wireDetails ? "Bank details on file" : "Send bank details"}
                  </p>
                  {selected.wireDetails && (
                    <div className="mt-2 space-y-1 text-sm">
                      <p><span className="text-[#5c5e66]">Bank:</span> {selected.wireDetails.bankName}</p>
                      <p><span className="text-[#5c5e66]">Account:</span> <span className="font-mono">{selected.wireDetails.accountNumber}</span></p>
                      <p><span className="text-[#5c5e66]">Beneficiary:</span> {selected.wireDetails.beneficiary}</p>
                      {selected.wireDetails.routing && (
                        <p><span className="text-[#5c5e66]">Routing:</span> <span className="font-mono">{selected.wireDetails.routing}</span></p>
                      )}
                      {selected.wireDetails.swift && (
                        <p><span className="text-[#5c5e66]">SWIFT:</span> <span className="font-mono">{selected.wireDetails.swift}</span></p>
                      )}
                    </div>
                  )}
                  {selected.status !== "paid" && selected.status !== "submitted" && (
                    <div className="mt-3 space-y-2">
                      <input
                        value={wireDraft.bankName}
                        onChange={(e) => setWireDraft((d) => ({ ...d, bankName: e.target.value }))}
                        placeholder="Bank name"
                        className="h-9 w-full rounded-lg border border-[#d2dbe8] bg-white px-3 text-sm outline-none focus:border-[#5865F2]"
                      />
                      <input
                        value={wireDraft.accountNumber}
                        onChange={(e) => setWireDraft((d) => ({ ...d, accountNumber: e.target.value }))}
                        placeholder="Account number"
                        className="h-9 w-full rounded-lg border border-[#d2dbe8] bg-white px-3 font-mono text-sm outline-none focus:border-[#5865F2]"
                      />
                      <input
                        value={wireDraft.beneficiary}
                        onChange={(e) => setWireDraft((d) => ({ ...d, beneficiary: e.target.value }))}
                        placeholder="Beneficiary name"
                        className="h-9 w-full rounded-lg border border-[#d2dbe8] bg-white px-3 text-sm outline-none focus:border-[#5865F2]"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={wireDraft.routing}
                          onChange={(e) => setWireDraft((d) => ({ ...d, routing: e.target.value }))}
                          placeholder="Routing (optional)"
                          className="h-9 w-full rounded-lg border border-[#d2dbe8] bg-white px-3 text-sm outline-none focus:border-[#5865F2]"
                        />
                        <input
                          value={wireDraft.swift}
                          onChange={(e) => setWireDraft((d) => ({ ...d, swift: e.target.value }))}
                          placeholder="SWIFT (optional)"
                          className="h-9 w-full rounded-lg border border-[#d2dbe8] bg-white px-3 text-sm outline-none focus:border-[#5865F2]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleWireDetails(selected)}
                        disabled={savingWire}
                        className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-[#5865F2] px-4 text-sm font-semibold text-white hover:bg-[#4752C4] disabled:opacity-70"
                      >
                        {savingWire ? "Sending…" : "Send bank details to customer"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#80848e]">Update status</p>
                <div className="flex flex-wrap gap-2">
                  {ORDER_STATUSES.filter((s) => s !== "all").map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleStatusChange(selected, s)}
                      disabled={pendingStatus !== null || selected.status === s}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        selected.status === s
                          ? "border-[#5865F2] bg-[#5865F2] text-white"
                          : "border-[#d2dbe8] bg-white text-[#5c5e66] hover:border-[#5865F2]/50"
                      }`}
                    >
                      {prettyStatus(s)}
                    </button>
                  ))}
                </div>
                {selected.status === "submitted" && (
                  <p className="mt-2 text-[11px] leading-relaxed text-[#5c5e66]">
                    Marking <strong>paid</strong> emails the customer a receipt and
                    unlocks fulfilment statuses.
                  </p>
                )}
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
