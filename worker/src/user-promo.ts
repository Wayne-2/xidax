import type { Env } from "./types";

export type UserPromo = {
  uid: string;
  code: string;
  discount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  uid: string;
  code: string;
  discount: number;
  active: number;
  created_at: string;
  updated_at: string;
};

function rowToPromo(row: Row): UserPromo {
  return {
    uid: row.uid,
    code: row.code,
    discount: Number(row.discount),
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Generates a short promo code that looks like the product codes. */
export function generateUserPromoCode(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let suffix = "";
  for (const byte of bytes) suffix += alphabet[byte % alphabet.length];

  return `PCM-${suffix}`;
}

export async function getUserPromo(
  env: Env,
  uid: string
): Promise<UserPromo | null> {
  const row = await env.DB.prepare(
    "SELECT uid, code, discount, active, created_at, updated_at FROM user_promos WHERE uid = ?1"
  )
    .bind(uid)
    .first<Row>();

  return row ? rowToPromo(row) : null;
}

/** Looks up a promo for a specific user by code. Never trusts a raw code alone. */
export async function getUserPromoByCode(
  env: Env,
  uid: string,
  rawCode: string
): Promise<UserPromo | null> {
  const code = rawCode.trim().toUpperCase();

  if (!/^[A-Z0-9-]{3,32}$/.test(code)) return null;

  const promo = await getUserPromo(env, uid);

  if (!promo || !promo.active || promo.code.toUpperCase() !== code) return null;

  return promo;
}

export async function assignUserPromo(
  env: Env,
  uid: string,
  rawCode: string,
  discount: number
): Promise<UserPromo | { error: string }> {
  const code = rawCode.trim().toUpperCase();

  if (!/^[A-Z0-9-]{3,32}$/.test(code)) {
    return { error: "Code must be 3–32 letters, numbers or hyphens." };
  }

  if (!Number.isFinite(discount) || discount < 1 || discount > 100) {
    return { error: "Discount must be between 1 and 100 percent." };
  }

  const existing = await env.DB.prepare(
    "SELECT uid FROM user_promos WHERE code = ?1"
  )
    .bind(code)
    .first<{ uid: string }>();

  if (existing && existing.uid !== uid) {
    return { error: "That code is already assigned to another user." };
  }

  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO user_promos (uid, code, discount, active, created_at, updated_at)
     VALUES (?1, ?2, ?3, 1, ?4, ?4)
     ON CONFLICT(uid) DO UPDATE SET
       code = excluded.code,
       discount = excluded.discount,
       active = 1,
       updated_at = excluded.updated_at`
  )
    .bind(uid, code, discount, now)
    .run();

  return (await getUserPromo(env, uid))!;
}

export async function setUserPromoActive(
  env: Env,
  uid: string,
  active: boolean
): Promise<boolean> {
  const result = await env.DB.prepare(
    "UPDATE user_promos SET active = ?1, updated_at = ?2 WHERE uid = ?3"
  )
    .bind(active ? 1 : 0, new Date().toISOString(), uid)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

export async function deleteUserPromo(
  env: Env,
  uid: string
): Promise<boolean> {
  const result = await env.DB.prepare(
    "DELETE FROM user_promos WHERE uid = ?1"
  )
    .bind(uid)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}
