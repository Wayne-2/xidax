import type { Env, WireDetails } from "./types";

export type BankAccountInput = {
  label: string;
  bankName: string;
  accountNumber: string;
  beneficiary: string;
  routing?: string;
  swift?: string;
  currency?: string;
  active?: boolean;
};

export type BankAccountRow = {
  id: string;
  label: string;
  bankName: string;
  accountNumber: string;
  beneficiary: string;
  routing: string | null;
  swift: string | null;
  currency: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export function normalizeBankAccount(
  input: BankAccountInput
): { ok: true; value: Required<BankAccountInput> } | { ok: false; error: string } {
  const label = String(input.label ?? "").trim();
  const bankName = String(input.bankName ?? "").trim();
  const accountNumber = String(input.accountNumber ?? "").trim();
  const beneficiary = String(input.beneficiary ?? "").trim();
  const routing = String(input.routing ?? "").trim();
  const swift = String(input.swift ?? "").trim();
  const currency = String(input.currency ?? "USD").trim().toUpperCase() || "USD";

  if (!label || label.length > 80) {
    return { ok: false, error: "Label is required (max 80 characters)." };
  }
  if (!bankName || bankName.length > 120) {
    return { ok: false, error: "Bank name is required." };
  }
  if (!accountNumber || accountNumber.length > 64) {
    return { ok: false, error: "Account number is required." };
  }
  if (!beneficiary || beneficiary.length > 120) {
    return { ok: false, error: "Beneficiary name is required." };
  }
  if (currency.length > 8) {
    return { ok: false, error: "Currency is too long." };
  }

  return {
    ok: true,
    value: {
      label,
      bankName,
      accountNumber,
      beneficiary,
      routing,
      swift,
      currency,
      active: input.active !== false,
    },
  };
}

function mapRow(row: {
  id: string;
  label: string;
  bank_name: string;
  account_number: string;
  beneficiary: string;
  routing: string | null;
  swift: string | null;
  currency: string;
  active: number;
  created_at: string;
  updated_at: string;
}): BankAccountRow {
  return {
    id: row.id,
    label: row.label,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    beneficiary: row.beneficiary,
    routing: row.routing,
    swift: row.swift,
    currency: row.currency,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_COLUMNS = `id, label, bank_name, account_number, beneficiary, routing, swift, currency, active, created_at, updated_at`;

export async function listBankAccounts(
  env: Env,
  activeOnly = false
): Promise<BankAccountRow[]> {
  const rows = await env.DB.prepare(
    `SELECT ${SELECT_COLUMNS}
       FROM bank_accounts
      ${activeOnly ? "WHERE active = 1" : ""}
      ORDER BY created_at DESC`
  ).all<{
    id: string;
    label: string;
    bank_name: string;
    account_number: string;
    beneficiary: string;
    routing: string | null;
    swift: string | null;
    currency: string;
    active: number;
    created_at: string;
    updated_at: string;
  }>();

  return (rows.results ?? []).map(mapRow);
}

export async function getBankAccount(
  env: Env,
  id: string
): Promise<BankAccountRow | null> {
  const row = await env.DB.prepare(
    `SELECT ${SELECT_COLUMNS} FROM bank_accounts WHERE id = ?1`
  )
    .bind(id)
    .first<{
      id: string;
      label: string;
      bank_name: string;
      account_number: string;
      beneficiary: string;
      routing: string | null;
      swift: string | null;
      currency: string;
      active: number;
      created_at: string;
      updated_at: string;
    }>();

  return row ? mapRow(row) : null;
}

export async function createBankAccount(
  env: Env,
  input: BankAccountInput
): Promise<{ ok: true; account: BankAccountRow } | { ok: false; error: string }> {
  const validated = normalizeBankAccount(input);
  if (!validated.ok) return { ok: false, error: validated.error };

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const value = validated.value;

  await env.DB.prepare(
    `INSERT INTO bank_accounts
       (id, label, bank_name, account_number, beneficiary, routing, swift, currency, active, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
  )
    .bind(
      id,
      value.label,
      value.bankName,
      value.accountNumber,
      value.beneficiary,
      value.routing || null,
      value.swift || null,
      value.currency,
      value.active ? 1 : 0,
      now,
      now
    )
    .run();

  const account = await getBankAccount(env, id);
  if (!account) return { ok: false, error: "Could not create bank account." };
  return { ok: true, account };
}

export async function updateBankAccount(
  env: Env,
  id: string,
  patch: Partial<BankAccountInput>
): Promise<
  { ok: true; account: BankAccountRow } | { ok: false; error: string; status?: number }
> {
  const existing = await getBankAccount(env, id);
  if (!existing) return { ok: false, error: "Bank account not found.", status: 404 };

  const validated = normalizeBankAccount({
    label: patch.label ?? existing.label,
    bankName: patch.bankName ?? existing.bankName,
    accountNumber: patch.accountNumber ?? existing.accountNumber,
    beneficiary: patch.beneficiary ?? existing.beneficiary,
    routing: patch.routing ?? existing.routing ?? "",
    swift: patch.swift ?? existing.swift ?? "",
    currency: patch.currency ?? existing.currency,
    active: patch.active ?? existing.active,
  });
  if (!validated.ok) return { ok: false, error: validated.error };

  const value = validated.value;
  const now = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE bank_accounts
        SET label = ?1, bank_name = ?2, account_number = ?3, beneficiary = ?4,
            routing = ?5, swift = ?6, currency = ?7, active = ?8, updated_at = ?9
      WHERE id = ?10`
  )
    .bind(
      value.label,
      value.bankName,
      value.accountNumber,
      value.beneficiary,
      value.routing || null,
      value.swift || null,
      value.currency,
      value.active ? 1 : 0,
      now,
      id
    )
    .run();

  const account = await getBankAccount(env, id);
  if (!account) return { ok: false, error: "Bank account not found.", status: 404 };
  return { ok: true, account };
}

export async function deleteBankAccount(
  env: Env,
  id: string
): Promise<{ ok: boolean; notFound?: boolean }> {
  const result = await env.DB.prepare("DELETE FROM bank_accounts WHERE id = ?1")
    .bind(id)
    .run();

  return { ok: true, notFound: (result.meta?.changes ?? 0) === 0 };
}

/** Maps a saved account into the WireDetails shape used on orders. */
export function bankAccountToWireDetails(
  account: BankAccountRow,
  reference?: string
): WireDetails {
  return {
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    beneficiary: account.beneficiary,
    routing: account.routing ?? undefined,
    swift: account.swift ?? undefined,
    reference,
  };
}
