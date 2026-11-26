"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import AdminWallets from "@/components/admin/AdminWallets";
import AdminBankAccounts from "@/components/admin/AdminBankAccounts";
import {
  fetchAdminBankAccounts,
  fetchAdminOrders,
  submitWireDetails,
  type AdminBankAccount,
  type AdminOrder,
} from "@/lib/admin-api";

function money(amount: number, currency = "USD") {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount); }
  catch { return `$${amount.toFixed(2)}`; }
}

export default function AdminPayments() {
  const toast = useToast();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [accounts, setAccounts] = useState<AdminBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { bankId: string; bankName: string; accountNumber: string; beneficiary: string; routing: string; swift: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersResult, bankResult] = await Promise.all([
        fetchAdminOrders({ status: "awaiting_admin", limit: 50 }),
        fetchAdminBankAccounts(),
      ]);
      const wireOrders = ordersResult.orders.filter((o) => o.method === "wire");
      setOrders(wireOrders);
      setAccounts(bankResult.accounts.filter((a) => a.active));
      setDrafts((prev) => {
        const next = { ...prev };
        for (const o of wireOrders) {
          if (!next[o.id]) next[o.id] = { bankId: "", bankName: o.wireDetails?.bankName ?? "", accountNumber: o.wireDetails?.accountNumber ?? "", beneficiary: o.wireDetails?.beneficiary ?? "", routing: o.wireDetails?.routing ?? "", swift: o.wireDetails?.swift ?? "" };
        }
        return next;
      });
    } catch (error) {
      toast.error((error as { error?: string }).error ?? "Could not load wire payments.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t); }, [load]);

  function applyAccount(orderId: string, bankId: string) {
    const account = accounts.find((a) => a.id === bankId);
    setDrafts((prev) => ({ ...prev, [orderId]: { bankId, bankName: account?.bankName ?? prev[orderId]?.bankName ?? "", accountNumber: account?.accountNumber ?? prev[orderId]?.accountNumber ?? "", beneficiary: account?.beneficiary ?? prev[orderId]?.beneficiary ?? "", routing: account?.routing ?? "", swift: account?.swift ?? "" } }));
  }

  async function sendDetails(order: AdminOrder) {
    const d = drafts[order.id];
    if (!d?.bankName.trim() || !d.accountNumber.trim() || !d.beneficiary.trim()) { toast.error("Bank name, account number, and beneficiary are required."); return; }
    setSendingId(order.id);
    try {
      await submitWireDetails(order.id, { bankName: d.bankName.trim(), accountNumber: d.accountNumber.trim(), beneficiary: d.beneficiary.trim(), routing: d.routing.trim() || undefined, swift: d.swift.trim() || undefined });
      toast.success(`Bank details sent for ${order.reference}.`);
      await load();
    } catch (error) {
      toast.error((error as { error?: string }).error ?? "Could not send bank details.");
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-[#5c5e66]">Manage crypto receiving wallets, wire bank accounts, and send wire details to customers.</p>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#80848e]">Wire orders needing bank details</h2>
          <button type="button" onClick={() => void load()} className="text-xs font-semibold text-[#5865F2] hover:underline">Refresh</button>
        </div>
        <div className="rounded-2xl border border-[#dce3ee] bg-white shadow-card">
          {loading ? (
            <div className="p-8 text-center text-sm text-[#5c5e66]">Loading…</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#5c5e66]">No wire orders waiting for bank details.</div>
          ) : (
            <ul className="divide-y divide-[#eef1f6]">
              {orders.map((order) => {
                const d = drafts[order.id] ?? { bankId: "", bankName: "", accountNumber: "", beneficiary: "", routing: "", swift: "" };
                return (
                  <li key={order.id} className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#2e3338]">{order.reference} <span className="text-[#80848e]">·</span> {money(order.total, order.currency)}</p>
                        <p className="text-xs text-[#5c5e66]">{order.name} · {order.email}</p>
                      </div>
                      <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-[11px] font-semibold text-orange-700">Awaiting admin</span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <select value={d.bankId} onChange={(e) => applyAccount(order.id, e.target.value)} className="h-9 rounded-lg border border-[#d2dbe8] bg-white px-3 text-sm outline-none focus:border-[#5865F2] sm:col-span-2">
                        <option value="">Fill from saved bank account…</option>
                        {accounts.map((a) => <option key={a.id} value={a.id}>{a.label} — {a.bankName}</option>)}
                      </select>
                      <input value={d.bankName} onChange={(e) => setDrafts((p) => ({ ...p, [order.id]: { ...d, bankName: e.target.value } }))} placeholder="Bank name" className="h-9 rounded-lg border border-[#d2dbe8] px-3 text-sm outline-none focus:border-[#5865F2]" />
                      <input value={d.accountNumber} onChange={(e) => setDrafts((p) => ({ ...p, [order.id]: { ...d, accountNumber: e.target.value } }))} placeholder="Account number" className="h-9 rounded-lg border border-[#d2dbe8] px-3 font-mono text-sm outline-none focus:border-[#5865F2]" />
                      <input value={d.beneficiary} onChange={(e) => setDrafts((p) => ({ ...p, [order.id]: { ...d, beneficiary: e.target.value } }))} placeholder="Beneficiary" className="h-9 rounded-lg border border-[#d2dbe8] px-3 text-sm outline-none focus:border-[#5865F2]" />
                      <div className="grid grid-cols-2 gap-2">
                        <input value={d.routing} onChange={(e) => setDrafts((p) => ({ ...p, [order.id]: { ...d, routing: e.target.value } }))} placeholder="Routing (opt)" className="h-9 rounded-lg border border-[#d2dbe8] px-3 text-sm outline-none focus:border-[#5865F2]" />
                        <input value={d.swift} onChange={(e) => setDrafts((p) => ({ ...p, [order.id]: { ...d, swift: e.target.value } }))} placeholder="SWIFT (opt)" className="h-9 rounded-lg border border-[#d2dbe8] px-3 text-sm outline-none focus:border-[#5865F2]" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <button type="button" onClick={() => void sendDetails(order)} disabled={sendingId === order.id} className="inline-flex h-9 items-center rounded-lg bg-[#5865F2] px-4 text-sm font-semibold text-white hover:bg-[#4752C4] disabled:opacity-70">{sendingId === order.id ? "Sending…" : "Send bank details to customer"}</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#80848e]">Crypto wallets</h2>
        <AdminWallets embedded />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#80848e]">Wire bank accounts</h2>
        <AdminBankAccounts />
      </section>
    </div>
  );
}
