"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import {
  createAdminBankAccount,
  deleteAdminBankAccount,
  fetchAdminBankAccounts,
  updateAdminBankAccount,
  type AdminBankAccount,
} from "@/lib/admin-api";

type Draft = {
  label: string;
  bankName: string;
  accountNumber: string;
  beneficiary: string;
  routing: string;
  swift: string;
  currency: string;
  active: boolean;
};

const emptyDraft: Draft = {
  label: "",
  bankName: "",
  accountNumber: "",
  beneficiary: "",
  routing: "",
  swift: "",
  currency: "USD",
  active: true,
};

const fieldClass =
  "h-10 w-full rounded-xl border border-[#d2dbe8] bg-white px-3 text-sm outline-none focus:border-[#5865F2]";

export default function AdminBankAccounts() {
  const toast = useToast();
  const [accounts, setAccounts] = useState<AdminBankAccount[]>([]);
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
      const result = await fetchAdminBankAccounts();
      setAccounts(result.accounts);
    } catch (err) {
      const message =
        (err as { error?: string }).error ?? "Could not load bank accounts.";
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

  function beginEdit(account: AdminBankAccount) {
    setEditingId(account.id);
    setDraft({
      label: account.label,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      beneficiary: account.beneficiary,
      routing: account.routing ?? "",
      swift: account.swift ?? "",
      currency: account.currency,
      active: account.active,
    });
  }

  function resetForm() {
    setEditingId(null);
    setDraft(emptyDraft);
  }

  async function handleSave() {
    const label = draft.label.trim();
    const bankName = draft.bankName.trim();
    const accountNumber = draft.accountNumber.trim();
    const beneficiary = draft.beneficiary.trim();

    if (!label) {
      toast.error("Label is required.");
      return;
    }
    if (!bankName) {
      toast.error("Bank name is required.");
      return;
    }
    if (!accountNumber) {
      toast.error("Account number is required.");
      return;
    }
    if (!beneficiary) {
      toast.error("Beneficiary name is required.");
      return;
    }

    const payload = {
      label,
      bankName,
      accountNumber,
      beneficiary,
      routing: draft.routing.trim(),
      swift: draft.swift.trim(),
      currency: draft.currency.trim().toUpperCase() || "USD",
      active: draft.active,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateAdminBankAccount(editingId, payload);
        toast.success("Bank account updated.");
      } else {
        await createAdminBankAccount(payload);
        toast.success("Bank account created.");
      }
      resetForm();
      await load();
    } catch (err) {
      toast.error(
        (err as { error?: string }).error ?? "Could not save bank account."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(account: AdminBankAccount) {
    setPendingId(account.id);
    try {
      await updateAdminBankAccount(account.id, { active: !account.active });
      toast.success(
        account.active ? "Bank account deactivated." : "Bank account activated."
      );
      await load();
    } catch (err) {
      toast.error(
        (err as { error?: string }).error ?? "Could not update bank account."
      );
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(account: AdminBankAccount) {
    if (
      !window.confirm(
        `Delete bank account "${account.label}"? It will no longer be available for wire orders.`
      )
    ) {
      return;
    }

    setPendingId(account.id);
    try {
      await deleteAdminBankAccount(account.id);
      toast.success("Bank account deleted.");
      if (editingId === account.id) resetForm();
      await load();
    } catch (err) {
      toast.error(
        (err as { error?: string }).error ?? "Could not delete bank account."
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="overflow-hidden rounded-2xl border border-[#dce3ee] bg-white shadow-card">
        {loading ? (
          <div className="p-10 text-center text-sm text-[#5c5e66]">
            Loading bank accounts…
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-[#B91C1C]">
              Could not load bank accounts.
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
        ) : accounts.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-[#2e3338]">
              No bank accounts yet.
            </p>
            <p className="mt-1 text-sm text-[#5c5e66]">
              Add a wire account so admins can send bank details to customers.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#eef1f6]">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex flex-wrap items-start justify-between gap-3 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[#2e3338]">
                      {account.label}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        account.active
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                          : "border-slate-500/30 bg-slate-500/10 text-slate-600"
                      }`}
                    >
                      {account.active ? "Active" : "Hidden"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#5c5e66]">
                    {account.bankName} · {account.currency}
                  </p>
                  <p className="mt-1 truncate font-mono text-[11px] text-[#80848e]">
                    {account.accountNumber} · {account.beneficiary}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleToggle(account)}
                    disabled={pendingId === account.id}
                    className="rounded-lg border border-[#d2dbe8] bg-white px-3 py-1.5 text-xs font-semibold text-[#5c5e66] hover:border-[#5865F2]/50 disabled:opacity-50"
                  >
                    {account.active ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    onClick={() => beginEdit(account)}
                    className="rounded-lg border border-[#d2dbe8] bg-white px-3 py-1.5 text-xs font-semibold text-[#5865F2] hover:border-[#5865F2]/50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(account)}
                    disabled={pendingId === account.id}
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
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2e3338]">
          {editingId ? "Edit bank account" : "Add bank account"}
        </h3>

        <div className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="bank-label"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
            >
              Label
            </label>
            <input
              id="bank-label"
              value={draft.label}
              onChange={(event) =>
                setDraft((current) => ({ ...current, label: event.target.value }))
              }
              placeholder="Primary operating account"
              className={fieldClass}
            />
          </div>

          <div>
            <label
              htmlFor="bank-name"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
            >
              Bank name
            </label>
            <input
              id="bank-name"
              value={draft.bankName}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  bankName: event.target.value,
                }))
              }
              placeholder="First National Bank"
              className={fieldClass}
            />
          </div>

          <div>
            <label
              htmlFor="bank-account"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
            >
              Account number
            </label>
            <input
              id="bank-account"
              value={draft.accountNumber}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  accountNumber: event.target.value,
                }))
              }
              placeholder="000123456789"
              className={`${fieldClass} font-mono`}
            />
          </div>

          <div>
            <label
              htmlFor="bank-beneficiary"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
            >
              Beneficiary
            </label>
            <input
              id="bank-beneficiary"
              value={draft.beneficiary}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  beneficiary: event.target.value,
                }))
              }
              placeholder="Generic PCs Ltd"
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="bank-routing"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
              >
                Routing
              </label>
              <input
                id="bank-routing"
                value={draft.routing}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    routing: event.target.value,
                  }))
                }
                placeholder="Optional"
                className={`${fieldClass} font-mono`}
              />
            </div>
            <div>
              <label
                htmlFor="bank-swift"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
              >
                SWIFT
              </label>
              <input
                id="bank-swift"
                value={draft.swift}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    swift: event.target.value,
                  }))
                }
                placeholder="Optional"
                className={`${fieldClass} font-mono`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="bank-currency"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
              >
                Currency
              </label>
              <input
                id="bank-currency"
                value={draft.currency}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    currency: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="USD"
                className={fieldClass}
              />
            </div>
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
            Available for wire orders
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex h-10 items-center rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white hover:bg-[#4752C4] disabled:opacity-70"
          >
            {saving
              ? "Saving…"
              : editingId
                ? "Save changes"
                : "Create account"}
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
  );
}
