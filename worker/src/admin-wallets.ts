import { CRYPTO_NETWORKS, type CryptoNetwork, type Env } from "./types";

export type WalletInput = {
  label: string;
  network: string;
  currency: string;
  address: string;
  qrCodeUrl?: string | null;
  active?: boolean;
};

export type WalletRow = {
  id: string;
  label: string;
  network: CryptoNetwork;
  currency: string;
  address: string;
  qrCodeUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export function normalize(
  input: WalletInput
): { ok: true; value: Required<WalletInput> } | { ok: false; error: string } {
  const label = String(input.label ?? "").trim();
  const network = String(input.network ?? "").trim().toLowerCase();
  const currency = String(input.currency ?? "").trim().toUpperCase();
  const address = String(input.address ?? "").trim();
  const qrCodeUrl = typeof input.qrCodeUrl === "string" ? input.qrCodeUrl.trim() : "";

  if (!label || label.length > 80) {
    return { ok: false, error: "Label is required (max 80 characters)." };
  }

  if (!CRYPTO_NETWORKS.has(network)) {
    return {
      ok: false,
      error: `Network must be one of: ${[...CRYPTO_NETWORKS].join(", ")}.`,
    };
  }

  if (!currency || currency.length > 12) {
    return { ok: false, error: "Currency is required." };
  }

  if (!address || address.length > 200) {
    return { ok: false, error: "Wallet address is required." };
  }
  if (qrCodeUrl.length > 500) {
    return { ok: false, error: "QR code URL is too long." };
  }

  return {
    ok: true,
    value: {
      label,
      network,
      currency,
      address,
      qrCodeUrl: qrCodeUrl || null,
      active: input.active !== false,
    },
  };
}

function mapRow(row: {
  id: string;
  label: string;
  network: string;
  currency: string;
  address: string;
  qr_code_url: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}): WalletRow {
  return {
    id: row.id,
    label: row.label,
    network: row.network as CryptoNetwork,
    currency: row.currency,
    address: row.address,
    qrCodeUrl: row.qr_code_url ?? null,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Lists wallets. When `activeOnly`, only wallets shown at checkout. */
export async function listWallets(
  env: Env,
  activeOnly = false
): Promise<WalletRow[]> {
  const rows = await env.DB.prepare(
    `SELECT id, label, network, currency, address, qr_code_url, active, created_at, updated_at
       FROM crypto_wallets
      ${activeOnly ? "WHERE active = 1" : ""}
      ORDER BY created_at DESC`
  ).all<{
    id: string;
    label: string;
    network: string;
    currency: string;
    address: string;
    qr_code_url: string | null;
    active: number;
    created_at: string;
    updated_at: string;
  }>();

  return (rows.results ?? []).map(mapRow);
}

export async function getWallet(env: Env, id: string): Promise<WalletRow | null> {
  const row = await env.DB.prepare(
    `SELECT id, label, network, currency, address, qr_code_url, active, created_at, updated_at
       FROM crypto_wallets WHERE id = ?1`
  )
    .bind(id)
    .first<{
      id: string;
      label: string;
      network: string;
      currency: string;
      address: string;
      qr_code_url: string | null;
      active: number;
      created_at: string;
      updated_at: string;
    }>();

  return row ? mapRow(row) : null;
}

export async function createWallet(
  env: Env,
  input: WalletInput
): Promise<{ ok: true; wallet: WalletRow } | { ok: false; error: string }> {
  const validated = normalize(input);
  if (!validated.ok) return { ok: false, error: validated.error };

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const value = validated.value;

  await env.DB.prepare(
    `INSERT INTO crypto_wallets (id, label, network, currency, address, qr_code_url, active, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
  )
    .bind(
      id,
      value.label,
      value.network,
      value.currency,
      value.address,
      value.qrCodeUrl,
      value.active ? 1 : 0,
      now,
      now
    )
    .run();

  const wallet = await getWallet(env, id);
  if (!wallet) return { ok: false, error: "Could not create wallet." };
  return { ok: true, wallet };
}

export async function updateWallet(
  env: Env,
  id: string,
  input: Partial<WalletInput>
): Promise<{ ok: true; wallet: WalletRow } | { ok: false; error: string; status?: number }> {
  const existing = await getWallet(env, id);
  if (!existing) return { ok: false, error: "Wallet not found.", status: 404 };

  const validated = normalize({
    label: input.label ?? existing.label,
    network: input.network ?? existing.network,
    currency: input.currency ?? existing.currency,
    address: input.address ?? existing.address,
    qrCodeUrl: input.qrCodeUrl ?? existing.qrCodeUrl,
    active: input.active ?? existing.active,
  });
  if (!validated.ok) return { ok: false, error: validated.error };

  const value = validated.value;
  const now = new Date().toISOString();

  await env.DB.prepare(
    `UPDATE crypto_wallets
        SET label = ?1, network = ?2, currency = ?3, address = ?4, qr_code_url = ?5, active = ?6, updated_at = ?7
      WHERE id = ?8`
  )
    .bind(
      value.label,
      value.network,
      value.currency,
      value.address,
      value.qrCodeUrl,
      value.active ? 1 : 0,
      now,
      id
    )
    .run();

  const wallet = await getWallet(env, id);
  if (!wallet) return { ok: false, error: "Wallet not found.", status: 404 };
  return { ok: true, wallet };
}

export async function deleteWallet(
  env: Env,
  id: string
): Promise<{ ok: boolean; notFound?: boolean }> {
  const result = await env.DB.prepare("DELETE FROM crypto_wallets WHERE id = ?1")
    .bind(id)
    .run();

  return { ok: true, notFound: (result.meta?.changes ?? 0) === 0 };
}
