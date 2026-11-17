import type { Env } from "./types";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  phone: string;
  country: string;
  postalCode: string;
  tier: string;
  emailVerified: boolean;
  createdAt: string;
  orders: number;
  products: number;
  hasPendingOtp: boolean;
};

/** Lists users with aggregate counts. Admin-only. */
export async function listAdminUsers(
  env: Env,
  url: URL
): Promise<{ users: AdminUser[]; total: number; limit: number; offset: number }> {
  const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "25", 10);
  const limit = Math.min(100, Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 25));
  const parsedOffset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
  const offset = Math.max(0, Number.isFinite(parsedOffset) ? parsedOffset : 0);
  const search = url.searchParams.get("search")?.trim().toLowerCase() ?? "";
  const verified = url.searchParams.get("verified") ?? "";

  const conditions: string[] = [];
  const bindings: (string | number)[] = [];

  if (search) {
    conditions.push("(LOWER(email) LIKE ? OR LOWER(name) LIKE ?)");
    const pattern = `%${search}%`;
    bindings.push(pattern, pattern);
  }

  if (verified === "yes") conditions.push("email_verified = 1");
  if (verified === "no") conditions.push("email_verified = 0");

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM users ${where}`
  )
    .bind(...bindings)
    .first<{ count: number }>();

  const rows = await env.DB.prepare(
    `SELECT id, email, name, phone, country, postal_code, tier, email_verified, created_at
       FROM users ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`
  )
    .bind(...bindings, limit, offset)
    .all<{
      id: string;
      email: string;
      name: string;
      phone: string | null;
      country: string | null;
      postal_code: string | null;
      tier: string | null;
      email_verified: number;
      created_at: string;
    }>();

  const users: AdminUser[] = [];

  for (const row of rows.results ?? []) {
    const [orderCount, productCount, otp] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS count FROM user_orders WHERE user_id = ?1")
        .bind(row.id)
        .first<{ count: number }>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM user_products WHERE user_id = ?1")
        .bind(row.id)
        .first<{ count: number }>(),
      env.DB.prepare("SELECT uid FROM email_otps WHERE uid = ?1")
        .bind(row.id)
        .first<{ uid: string }>(),
    ]);

    users.push({
      id: row.id,
      email: row.email,
      name: row.name,
      phone: row.phone ?? "",
      country: row.country ?? "",
      postalCode: row.postal_code ?? "",
      tier: row.tier ?? "Member",
      emailVerified: row.email_verified === 1,
      createdAt: row.created_at,
      orders: orderCount?.count ?? 0,
      products: productCount?.count ?? 0,
      hasPendingOtp: Boolean(otp),
    });
  }

  return {
    users,
    total: countRow?.count ?? 0,
    limit,
    offset,
  };
}

/** Gets a single user by id. Admin-only. */
export async function getAdminUser(env: Env, id: string): Promise<AdminUser | null> {
  const row = await env.DB.prepare(
    `SELECT id, email, name, phone, country, postal_code, tier, email_verified, created_at
       FROM users WHERE id = ?1`
  )
    .bind(id)
    .first<{
      id: string;
      email: string;
      name: string;
      phone: string | null;
      country: string | null;
      postal_code: string | null;
      tier: string | null;
      email_verified: number;
      created_at: string;
    }>();

  if (!row) return null;

  const orderCount = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM user_orders WHERE user_id = ?1"
  )
    .bind(row.id)
    .first<{ count: number }>();

  const productCount = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM user_products WHERE user_id = ?1"
  )
    .bind(row.id)
    .first<{ count: number }>();

  const otp = await env.DB.prepare(
    "SELECT uid FROM email_otps WHERE uid = ?1"
  )
    .bind(row.id)
    .first<{ uid: string }>();

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone ?? "",
    country: row.country ?? "",
    postalCode: row.postal_code ?? "",
    tier: row.tier ?? "Member",
    emailVerified: row.email_verified === 1,
    createdAt: row.created_at,
    orders: orderCount?.count ?? 0,
    products: productCount?.count ?? 0,
    hasPendingOtp: Boolean(otp),
  };
}

/** Returns high level user stats. Admin-only. */
export async function getAdminUserStats(env: Env) {
  const [totals, verified] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS count FROM users").first<{ count: number }>(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE email_verified = 1").first<{ count: number }>(),
  ]);

  return {
    totalUsers: totals?.count ?? 0,
    verifiedUsers: verified?.count ?? 0,
    unverifiedUsers: (totals?.count ?? 0) - (verified?.count ?? 0),
  };
}
