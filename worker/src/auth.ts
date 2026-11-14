import type { Env } from "./types";

export type StoredUser = {
  id: string;
  email: string;
  name: string;
  phone: string;
  country: string;
  postalCode: string;
  tier: string;
  memberSince: string;
  bachsCustomerId: string | null;
  createdAt: string;
};

const PBKDF2_ITERATIONS = 100000;
const SESSION_DAYS = 30;

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function randomToken(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

export async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    key,
    256
  );

  return toHex(bits);
}

export async function createPassword(password: string) {
  const salt = randomToken(16);
  return { salt, hash: await hashPassword(password, salt) };
}

export async function verifyPassword(
  password: string,
  salt: string,
  expected: string
) {
  const actual = await hashPassword(password, salt);

  if (actual.length !== expected.length) return false;

  let diff = 0;

  for (let index = 0; index < actual.length; index += 1) {
    diff |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }

  return diff === 0;
}

export function readToken(request: Request) {
  const header = request.headers.get("authorization");

  if (header?.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }

  return null;
}

export async function findUserByToken(env: Env, token: string) {
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.phone, u.country, u.postal_code, u.tier,
            u.bachs_customer_id, u.created_at, s.expires_at
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = ?1`
  )
    .bind(token)
    .first<{
      id: string;
      email: string;
      name: string;
      phone: string | null;
      country: string | null;
      postal_code: string | null;
      tier: string | null;
      bachs_customer_id: string | null;
      created_at: string;
      expires_at: string;
    }>();

  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB.prepare("DELETE FROM user_sessions WHERE token = ?1")
      .bind(token)
      .run();
    return null;
  }

  return toUser(row);
}

export function toUser(row: {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  country: string | null;
  postal_code: string | null;
  tier: string | null;
  bachs_customer_id: string | null;
  created_at: string;
}): StoredUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone ?? "",
    country: row.country ?? "",
    postalCode: row.postal_code ?? "",
    tier: row.tier ?? "Member",
    memberSince: row.created_at.slice(0, 4),
    bachsCustomerId: row.bachs_customer_id ?? null,
    createdAt: row.created_at,
  };
}

export async function createSession(env: Env, userId: string) {
  const token = randomToken(32);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  await env.DB.prepare(
    "INSERT INTO user_sessions (token, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)"
  )
    .bind(token, userId, createdAt, expiresAt)
    .run();

  return { token, expiresAt };
}

export async function ensureSettings(env: Env, userId: string) {
  await env.DB.prepare(
    "INSERT OR IGNORE INTO user_settings (user_id) VALUES (?1)"
  )
    .bind(userId)
    .run();

  const row = await env.DB.prepare(
    "SELECT order_updates, drop_notifications, marketing_emails, language, currency FROM user_settings WHERE user_id = ?1"
  )
    .bind(userId)
    .first<{
      order_updates: number;
      drop_notifications: number;
      marketing_emails: number;
      language: string;
      currency: string;
    }>();

  return {
    orderUpdates: Boolean(row?.order_updates),
    dropNotifications: Boolean(row?.drop_notifications),
    marketingEmails: Boolean(row?.marketing_emails),
    language: row?.language ?? "English (Nigeria)",
    currency: row?.currency ?? "USD ($)",
  };
}
