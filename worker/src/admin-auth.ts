import type { Env } from "./types";
import { ensureInitialized } from "./auth";

export type AdminAuthResult =
  | { ok: true; uid: string; email: string; token: string }
  | { ok: false; status: number; error: string };

type AdminAuthSuccess = Extract<AdminAuthResult, { ok: true }>;

type AdminGuardResult =
  | { authorized: true; auth: AdminAuthSuccess }
  | { authorized: false; response: Response };

/**
 * Verifies the Firebase ID token and checks that the verified email is on the
 * D1 admin allowlist.
 *
 * Using the email from the verified token (never from the request body) and a
 * server-side allowlist means access can be granted or revoked instantly: a
 * newly added admin works with their existing token, and a revoked admin is
 * denied on their very next request.
 */
export async function requireAdmin(
  request: Request,
  env: Env
): Promise<AdminAuthResult> {
  const header = request.headers.get("authorization");

  if (!header?.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, error: "Authentication required." };
  }

  const token = header.slice(7).trim();

  if (!token) {
    return { ok: false, status: 401, error: "Authentication required." };
  }

  try {
    const { auth: firebaseAuth } = await ensureInitialized(env);
    const decoded = await firebaseAuth.verifyIdToken(token, true);

    const email = (decoded.email ?? "").toLowerCase().trim();

    if (!email) {
      return { ok: false, status: 403, error: "Admin access required." };
    }

    // The allowlist is the authoritative source of truth.
    const row = await env.DB.prepare(
      "SELECT email FROM admins WHERE email = ?1"
    )
      .bind(email)
      .first<{ email: string }>();

    if (!row) {
      return { ok: false, status: 403, error: "Admin access required." };
    }

    return {
      ok: true,
      uid: decoded.uid,
      email,
      token,
    };
  } catch (error) {
    const code = (error as { code?: string }).code ?? "";

    if (
      code === "auth/invalid-id-token" ||
      code === "auth/expired-id-token" ||
      code === "auth/id-token-expired"
    ) {
      return { ok: false, status: 401, error: "Session expired. Sign in again." };
    }

    if (code === "auth/revoked-id-token") {
      return { ok: false, status: 401, error: "Session revoked. Sign in again." };
    }

    return { ok: false, status: 401, error: "Invalid authentication." };
  }
}

/** Guard that returns a Response on failure. */
export async function adminGuard(
  request: Request,
  env: Env,
  jsonWithCors: (
    payload: unknown,
    request: Request,
    env: Env,
    status?: number
  ) => Response
): Promise<AdminGuardResult> {
  const auth = await requireAdmin(request, env);

  if (!auth.ok) {
    return {
      authorized: false,
      response: jsonWithCors({ error: auth.error }, request, env, auth.status),
    };
  }

  return { authorized: true, auth };
}
