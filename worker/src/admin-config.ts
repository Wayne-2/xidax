import type { Env } from "./types";

export const SUPPORT_EMAIL_KEY = "admin:config:support_email";
export const DEFAULT_SUPPORT_EMAIL = "supportsgenericpcs@gmail.com";

export function normalizeSupportEmail(value: unknown): string | null {
  const email = String(value ?? "").trim().toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (email.length > 200) return null;
  return email;
}

export async function getSupportEmail(env: Env): Promise<string> {
  try {
    const stored = await env.SESSIONS.get(SUPPORT_EMAIL_KEY, "text");
    return normalizeSupportEmail(stored) ?? DEFAULT_SUPPORT_EMAIL;
  } catch {
    return DEFAULT_SUPPORT_EMAIL;
  }
}

export async function setSupportEmail(env: Env, value: unknown): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const email = normalizeSupportEmail(value);
  if (!email) return { ok: false, error: "Enter a valid support email address." };
  await env.SESSIONS.put(SUPPORT_EMAIL_KEY, email);
  return { ok: true, email };
}
