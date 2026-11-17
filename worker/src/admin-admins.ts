import type { Env } from "./types";
import { ensureInitialized } from "./auth";

export type AdminEntry = {
  email: string;
  createdAt: string;
  createdBy: string | null;
};

/** Lists all admins on the allowlist. */
export async function listAdmins(env: Env): Promise<AdminEntry[]> {
  const rows = await env.DB.prepare(
    "SELECT email, created_at, created_by FROM admins ORDER BY created_at DESC"
  ).all<{ email: string; created_at: string; created_by: string | null }>();

  return (rows.results ?? []).map((row) => ({
    email: row.email,
    createdAt: row.created_at,
    createdBy: row.created_by,
  }));
}

/** Adds an email to the admin allowlist. Requires a Firebase account to exist. */
export async function addAdmin(
  env: Env,
  email: string,
  createdBy: string | null
): Promise<
  | { ok: true; email: string }
  | { ok: false; status: number; error: string }
> {
  const normalized = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { ok: false, status: 400, error: "Enter a valid email address." };
  }

  const existing = await env.DB.prepare(
    "SELECT email FROM admins WHERE email = ?1"
  )
    .bind(normalized)
    .first<{ email: string }>();

  if (existing) {
    return { ok: false, status: 409, error: "That email is already an admin." };
  }

  try {
    const { auth: firebaseAuth } = await ensureInitialized(env);
    await firebaseAuth.getUserByEmail(normalized);
  } catch (error) {
    const code = (error as { code?: string }).code ?? "";

    if (code === "auth/user-not-found") {
      return {
        ok: false,
        status: 404,
        error: "No account exists with that email. They must sign up first.",
      };
    }

    return { ok: false, status: 500, error: "Could not look up that account." };
  }

  await env.DB.prepare(
    "INSERT INTO admins (email, created_at, created_by) VALUES (?1, ?2, ?3)"
  )
    .bind(normalized, new Date().toISOString(), createdBy)
    .run();

  return { ok: true, email: normalized };
}

/** Removes an email from the admin allowlist. */
export async function removeAdmin(
  env: Env,
  email: string
): Promise<{ ok: boolean; notFound?: boolean }> {
  const normalized = email.trim().toLowerCase();

  const result = await env.DB.prepare(
    "DELETE FROM admins WHERE email = ?1"
  )
    .bind(normalized)
    .run();

  return {
    ok: true,
    notFound: (result.meta?.changes ?? 0) === 0,
  };
}

/** Counts admins, used to prevent removing the last one. */
export async function countAdmins(env: Env): Promise<number> {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM admins"
  ).first<{ count: number }>();

  return row?.count ?? 0;
}
