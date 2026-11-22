"use client";

import AdminWallets from "@/components/admin/AdminWallets";
import AdminBankAccounts from "@/components/admin/AdminBankAccounts";

/**
 * Dedicated admin Payments page: crypto wallets + wire bank accounts.
 * Replaces the orphaned standalone Wallets tab.
 */
export default function AdminPayments() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-[#5c5e66]">
          Manage crypto receiving wallets and wire bank accounts used at checkout.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#80848e]">
          Crypto wallets
        </h2>
        <AdminWallets embedded />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#80848e]">
          Wire bank accounts
        </h2>
        <AdminBankAccounts />
      </section>
    </div>
  );
}
