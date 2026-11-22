"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import {
  createAdminWallet,
  deleteAdminWallet,
  fetchAdminWallets,
  updateAdminWallet,
  type AdminWallet,
} from "@/lib/admin-api";

const NETWORK_OPTIONS = [
  { value: "btc", label: "Bitcoin (BTC)", defaultCurrency: "BTC" },
  { value: "eth", label: "Ethereum (ETH)", defaultCurrency: "ETH" },
  { value: "bnb", label: "BNB", defaultCurrency: "BNB" },
  { value: "doge", label: "Dogecoin (DOGE)", defaultCurrency: "DOGE" },
  { value: "ltc", label: "Litecoin (LTC)", defaultCurrency: "LTC" },
  { value: "xrp", label: "XRP", defaultCurrency: "XRP" },
  { value: "sol", label: "Solana (SOL)", defaultCurrency: "SOL" },
  { value: "usdc", label: "USDC", defaultCurrency: "USDC" },
  { value: "usdt_trc20", label: "USDT — TRC20", defaultCurrency: "USDT" },
  { value: "usdt_erc20", label: "USDT — ERC20", defaultCurrency: "USDT" },
  { value: "trx", label: "TRON (TRX)", defaultCurrency: "TRX" },
  { value: "matic", label: "Polygon (MATIC)", defaultCurrency: "MATIC" },
  { value: "avax", label: "Avalanche (AVAX)", defaultCurrency: "AVAX" },
] as const;

type Draft = {
  label: string;
  network: string;
  currency: string;
  address: string;
  active: boolean;
};

const emptyDraft: Draft = {
  label: "",
  network: "usdt_trc20",
  currency: "USDT",
  address: "",
  active: true,
};

export default function AdminWallets({ embedded = false }: { embedded?: boolean }) {
  const toast = useToast();
  const [wallets, setWallets] = useState<AdminWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchAdminWallets();
      setWallets(result.wallets);
    } catch (err) {
      const message = (err as { error?: string }).error ?? "Could not load wallets.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function beginEdit(wallet: AdminWallet) {
    setEditingId(wallet.id);
    setDraft({
      label: wallet.label,
      network: wallet.network,
      currency: wallet.currency,
      address: wallet.address,
      active: wallet.active,
    });
  }

  function resetForm() {
    setEditingId(null);
    setDraft(emptyDraft);
  }

  async function handleSave() {
    const label = draft.label.trim();
    const address = draft.address.trim();
    const currency = draft.currency.trim().toUpperCase();

    if (!label) {
      toast.error("Label is required.");
      return;
    }
    if (!address) {
      toast.error("Wallet address is required.");
      return;
    }
    if (!currency) {
      toast.error("Currency is required.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateAdminWallet(editingId, {
          label,
          network: draft.network,
          currency,
          address,
          active: draft.active,
        });
        toast.success("Wallet updated.");
      } else {
        await createAdminWallet({
          label,
          network: draft.network,
          currency,
          address,
          active: draft.active,
        });
        toast.success("Wallet created.");
      }
      resetForm();
      await load();
    } catch (err) {
      toast.error((err as { error?: string }).error ?? "Could not save wallet.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(wallet: AdminWallet) {
    setPendingId(wallet.id);
    try {
      await updateAdminWallet(wallet.id, { active: !wallet.active });
      toast.success(wallet.active ? "Wallet deactivated." : "Wallet activated.");
      await load();
    } catch (err) {
      toast.error((err as { error?: string }).error ?? "Could not update wallet.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(wallet: AdminWallet) {
    if (
      !window.confirm(
        `Delete wallet "${wallet.label}"? Customers will no longer see it at checkout.`
      )
    ) {
      return;
    }

    setPendingId(wallet.id);
    try {
      await deleteAdminWallet(wallet.id);
      toast.success("Wallet deleted.");
      if (editingId === wallet.id) resetForm();
      await load();
    } catch (err) {
      toast.error((err as { error?: string }).error ?? "Could not delete wallet.");
    } finally {
      setPendingId(null);
    }
  }

  const fieldClass =
    "h-10 w-full rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm outline-none focus:border-[#5865F2]";

  return (
    <div>
      {!embedded && (
        <>
          <h1 className="text-2xl font-extrabold tracking-tight">Crypto wallets</h1>
          <p className="mt-1 text-sm text-[#5c5e66]">
            Manage the destinations customers send crypto to at checkout.
          </p>
        </>
      )}

      <div className={`${embedded ? "" : "mt-6"} grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start`}>
        <div className="overflow-hidden rounded-2xl border border-[#dce3ee] bg-white shadow-card">
          {loading ? (
            <div className="p-10 text-center text-sm text-[#5c5e66]">
              Loading wallets…
            </div>
          ) : error ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-[#B91C1C]">
                Could not load wallets.
              </p>
              <p className="mt-1 text-sm text-[#5c5e66]">{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-4 inline-flex h-10 items-center rounded-lg bg-[#5865F2] px-5 text-sm font-semibold text-white hover:bg-[#4752C4]"
              >
                Retry
              </button>
            </div>
          ) : wallets.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-[#2e3338]">
                No wallets yet.
              </p>
              <p className="mt-1 text-sm text-[#5c5e66]">
                Add a wallet so customers can pay with crypto.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#eef1f6]">
              {wallets.map((wallet) => (
                <li
                  key={wallet.id}
                  className="flex flex-wrap items-start justify-between gap-3 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#2e3338]">
                        {wallet.label}
                      </p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          wallet.active
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                            : "border-slate-500/30 bg-slate-500/10 text-slate-600"
                        }`}
                      >
                        {wallet.active ? "Active" : "Hidden"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#5c5e66]">
                      {wallet.currency} · {wallet.network}
                    </p>
                    <p className="mt-1 truncate font-mono text-[11px] text-[#80848e]">
                      {wallet.address}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleToggle(wallet)}
                      disabled={pendingId === wallet.id}
                      className="rounded-lg border border-[#d2dbe8] bg-white px-3 py-1.5 text-xs font-semibold text-[#5c5e66] hover:border-[#5865F2]/50 disabled:opacity-50"
                    >
                      {wallet.active ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      onClick={() => beginEdit(wallet)}
                      className="rounded-lg border border-[#d2dbe8] bg-white px-3 py-1.5 text-xs font-semibold text-[#5865F2] hover:border-[#5865F2]/50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(wallet)}
                      disabled={pendingId === wallet.id}
                      className="rounded-lg border border-[#DC2626]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#B91C1C] hover:border-[#DC2626]/50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-[#dce3ee] bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2e3338]">
            {editingId ? "Edit wallet" : "Add wallet"}
          </h2>

          <div className="mt-4 space-y-3">
            <div>
              <label
                htmlFor="wallet-label"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
              >
                Label
              </label>
              <input
                id="wallet-label"
                value={draft.label}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, label: event.target.value }))
                }
                placeholder="USDT treasury"
                className={fieldClass}
              />
            </div>

            <div>
              <label
                htmlFor="wallet-network"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
              >
                Network
              </label>
              <select
                id="wallet-network"
                value={draft.network}
                onChange={(event) => {
                  const network = event.target.value;
                  const match = NETWORK_OPTIONS.find((entry) => entry.value === network);
                  setDraft((current) => ({
                    ...current,
                    network,
                    currency: match?.defaultCurrency ?? current.currency,
                  }));
                }}
                className={fieldClass}
              >
                {NETWORK_OPTIONS.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="wallet-currency"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
              >
                Currency
              </label>
              <input
                id="wallet-currency"
                value={draft.currency}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    currency: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="USDT"
                className={fieldClass}
              />
            </div>

            <div>
              <label
                htmlFor="wallet-address"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
              >
                Address
              </label>
              <input
                id="wallet-address"
                value={draft.address}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
                placeholder="Paste the receiving address"
                className={`${fieldClass} font-mono text-xs`}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-[#2e3338]">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    active: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-[#d2dbe8] accent-[#5865F2]"
              />
              Show at checkout
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex h-10 items-center rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white hover:bg-[#4752C4] disabled:opacity-70"
            >
              {saving ? "Saving…" : editingId ? "Save changes" : "Create wallet"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-10 items-center rounded-xl border border-[#d2dbe8] bg-white px-4 text-sm font-semibold text-[#5c5e66] hover:border-[#b8c4d6]"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
