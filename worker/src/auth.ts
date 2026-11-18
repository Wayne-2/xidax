import type { Env } from "./types";
import {
  cert,
  initializeApp,
  getApps,
  type App,
} from "firebase-admin/app";
import {
  getAuth as getFirebaseAuth,
  type Auth,
} from "firebase-admin/auth";
import type { UserRecord as AdminUser } from "firebase-admin/auth";


let app: App | null = null;
let auth: Auth | null = null;

export type FirebaseUser = AdminUser;

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
  emailVerified: boolean;
  createdAt: string;
};

export const SESSION_DAYS = 30;

/** OTP lifetime in milliseconds. */
export const OTP_TTL_MS = 5 * 60 * 1000;

/** Maximum number of incorrect OTP submissions allowed. */
export const OTP_MAX_ATTEMPTS = 5;

/** Minimum seconds between two OTP emails for the same user. */
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export function getAuth(): Auth {
  if (!auth) {
    throw new Error("Firebase Auth is not initialised.");
  }
  return auth;
}

/**
 * Parses FIREBASE_CONFIG leniently.
 *
 * Cloudflare secrets are plain strings, and pasting a service account JSON
 * usually breaks in one of three ways:
 *  - escaped newlines inside privateKey ("\n" inside a JSON string)
 *  - real newlines inside privateKey (invalid JSON)
 *  - the whole payload pasted as a single-line blob
 *
 * This handles all of them.
 */
export function parseFirebaseConfig(raw: string): {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
  clientEmail?: string;
  privateKey?: string;
} {
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new Error("FIREBASE_CONFIG is empty.");
  }

  let parsed: Record<string, unknown> = {};

  try {
    parsed = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    // Not valid JSON. Try base64 (a common way to store multi-line secrets).
    try {
      const decoded = atob(trimmed);
      parsed = JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      throw new Error(
        "FIREBASE_CONFIG is not valid JSON. Provide the Firebase config as a JSON object."
      );
    }
  }

  const privateKeyRaw =
    typeof parsed.privateKey === "string"
      ? parsed.privateKey
      : typeof parsed.private_key === "string"
        ? parsed.private_key
        : undefined;

  // Restore real newlines that were escaped during JSON transport.
  const privateKey = privateKeyRaw?.replace(/\\n/g, "\n");

  const pick = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = parsed[key];
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }
    return undefined;
  };

  return {
    apiKey: pick("apiKey", "api_key"),
    authDomain: pick("authDomain", "auth_domain"),
    projectId: pick("projectId", "project_id"),
    storageBucket: pick("storageBucket", "storage_bucket"),
    messagingSenderId: pick("messagingSenderId", "messaging_sender_id"),
    appId: pick("appId", "app_id"),
    measurementId: pick("measurementId", "measurement_id"),
    clientEmail: pick("clientEmail", "client_email"),
    privateKey,
  };
}

/** Initialises the Firebase Admin SDK once per isolate. */
export async function ensureInitialized(env: Env) {
  if (auth) {
    return { auth };
  }

  const raw = env.FIREBASE_CONFIG;

  if (!raw) {
    throw new Error("FIREBASE_CONFIG is not set.");
  }

  const config = parseFirebaseConfig(raw);

  if (!config.projectId) {
    throw new Error("FIREBASE_CONFIG is missing projectId.");
  }

  if (!config.clientEmail || !config.privateKey) {
    throw new Error(
      "FIREBASE_CONFIG is missing clientEmail/privateKey. Provide a service account key."
    );
  }

  if (!app) {
    app =
      getApps()[0] ??
      initializeApp({
        credential: cert({
          projectId: config.projectId,
          clientEmail: config.clientEmail,
          privateKey: config.privateKey,
        }),
      });
  }

  auth = getFirebaseAuth(app);

  return { auth };
}

/* ------------------------------------------------------------------ */
/* Tokens and sessions                                                   */
/* ------------------------------------------------------------------ */

export function randomToken(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  const hexChars = "0123456789abcdef";
  let token = "";
  for (let i = 0; i < bytes.length; i += 1) {
    token += hexChars[bytes[i] >> 4];
    token += hexChars[bytes[i] & 0xf];
  }
  return token;
}

export function readToken(request: Request) {
  const header = request.headers.get("authorization");

  if (header?.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }

  return null;
}

export async function findUserByToken(env: Env, token: string) {
  const db = requireDb(env);

  const row = await db
    .prepare(
      `SELECT u.id, u.email, u.name, u.phone, u.country, u.postal_code, u.tier,
              u.bachs_customer_id, u.email_verified, u.created_at
         FROM user_sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token = ?1 AND s.expires_at > ?2`
    )
    .bind(token, new Date().toISOString())
    .first<{
      id: string;
      email: string;
      name: string;
      phone: string | null;
      country: string | null;
      postal_code: string | null;
      tier: string | null;
      bachs_customer_id: string | null;
      email_verified: number;
      created_at: string;
    }>();

  if (!row) return null;

  // Authoritative gate: a session token never grants access until the email
  // is verified, even if a token was issued earlier.
  if (row.email_verified !== 1) return null;

  return rowToStoredUser(row);
}

/** Maps a database row onto the shared StoredUser shape. */
export function rowToStoredUser(row: {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  country: string | null;
  postal_code: string | null;
  tier: string | null;
  bachs_customer_id: string | null;
  email_verified: number;
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
    memberSince: row.created_at ? row.created_at.slice(0, 4) : "2024",
    bachsCustomerId: row.bachs_customer_id ?? null,
    emailVerified: row.email_verified === 1,
    createdAt: row.created_at,
  };
}

export function toUser(row: StoredUser): StoredUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone ?? "",
    country: row.country ?? "",
    postalCode: row.postalCode ?? "",
    tier: row.tier ?? "Member",
    memberSince: row.memberSince ?? "2024",
    bachsCustomerId: row.bachsCustomerId ?? null,
    emailVerified: row.emailVerified,
    createdAt: row.createdAt,
  };
}

export async function createSession(env: Env, userId: string) {
  const db = requireDb(env);
  const token = randomToken(32);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  await db
    .prepare(
      `INSERT INTO user_sessions (token, user_id, created_at, expires_at)
       VALUES (?1, ?2, ?3, ?4)`
    )
    .bind(token, userId, createdAt, expiresAt)
    .run();

  return { token, expiresAt };
}

export async function ensureSettings(env: Env, userId: string) {
  const db = requireDb(env);

  const row = await db
    .prepare(
      `SELECT order_updates, drop_notifications, marketing_emails, language, currency
         FROM user_settings WHERE user_id = ?1`
    )
    .bind(userId)
    .first<{
      order_updates: number;
      drop_notifications: number;
      marketing_emails: number;
      language: string;
      currency: string;
    }>();

  if (row) {
    return {
      orderUpdates: row.order_updates === 1,
      dropNotifications: row.drop_notifications === 1,
      marketingEmails: row.marketing_emails === 1,
      language: row.language ?? "English (Nigeria)",
      currency: row.currency ?? "USD ($)",
    };
  }

  await db
    .prepare(
      `INSERT OR IGNORE INTO user_settings
         (user_id, order_updates, drop_notifications, marketing_emails, language, currency)
       VALUES (?1, 1, 1, 0, 'English (Nigeria)', 'USD ($)')`
    )
    .bind(userId)
    .run();

  return {
    orderUpdates: true,
    dropNotifications: true,
    marketingEmails: false,
    language: "English (Nigeria)",
    currency: "USD ($)",
  };
}

/* ------------------------------------------------------------------ */
/* OTP primitives                                                        */
/* ------------------------------------------------------------------ */

/**
 * Generates a cryptographically secure six digit OTP.
 * Leading zeros are preserved because the value is always exactly six
 * characters long.
 */
export function generateSixDigitOTP(): string {
  const digits = "0123456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);

  let otp = "";
  for (let i = 0; i < 6; i += 1) {
    otp += digits[bytes[i] % 10];
  }

  return otp;
}

/** Hashes an OTP with a server side pepper so the plaintext is never stored. */
export async function hashOTP(otp: string, pepper: string): Promise<string> {
  const data = new TextEncoder().encode(`${pepper}:${otp}`);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant time string comparison to avoid timing leaks. */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return diff === 0;
}

function otpPepper(env: Env): string {
  const pepper = env.OTP_SECRET;

  if (!pepper || pepper.length < 16) {
    throw new Error(
      "OTP_SECRET must be set to a value of at least 16 characters."
    );
  }

  return pepper;
}

/* ------------------------------------------------------------------ */
/* OTP storage (Cloudflare D1)                                          */
/* ------------------------------------------------------------------ */

export type OtpVerificationResult =
  | { valid: true }
  | {
      valid: false;
      reason:
        | "not_found"
        | "expired"
        | "max_attempts"
        | "invalid_otp"
        | "unavailable";
      attemptsRemaining?: number;
    };

function requireDb(env: Env): D1Database {
  const db = env.DB;

  if (!db) {
    throw new Error("D1 database binding DB is not configured.");
  }

  return db;
}

export async function storeOTP(
  env: Env,
  uid: string,
  email: string,
  otp: string
): Promise<void> {
  const db = requireDb(env);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + Math.floor(OTP_TTL_MS / 1000);

  await db
    .prepare(
      `INSERT INTO email_otps (uid, email, otp_hash, expires_at, attempts, last_sent_at, created_at)
       VALUES (?1, ?2, ?3, ?4, 0, ?5, ?5)
       ON CONFLICT(uid) DO UPDATE SET
         email = excluded.email,
         otp_hash = excluded.otp_hash,
         expires_at = excluded.expires_at,
         attempts = 0,
         last_sent_at = excluded.last_sent_at,
         created_at = excluded.created_at`
    )
    .bind(uid, email, await hashOTP(otp, otpPepper(env)), expiresAt, now)
    .run();
}

export async function verifyOTP(
  env: Env,
  uid: string,
  submittedOTP: string
): Promise<OtpVerificationResult> {
  const db = requireDb(env);

  const row = await db
    .prepare(
      `SELECT otp_hash, expires_at, attempts FROM email_otps WHERE uid = ?1`
    )
    .bind(uid)
    .first<{ otp_hash: string; expires_at: number; attempts: number }>();

  if (!row) {
    return { valid: false, reason: "not_found" };
  }

  const attempts = row.attempts ?? 0;

  if (attempts >= OTP_MAX_ATTEMPTS) {
    await db.prepare("DELETE FROM email_otps WHERE uid = ?1").bind(uid).run();
    return { valid: false, reason: "max_attempts" };
  }

  const now = Math.floor(Date.now() / 1000);

  if (row.expires_at < now) {
    await db.prepare("DELETE FROM email_otps WHERE uid = ?1").bind(uid).run();
    return { valid: false, reason: "expired" };
  }

  const submittedHash = await hashOTP(submittedOTP, otpPepper(env));

  if (!safeCompare(row.otp_hash ?? "", submittedHash)) {
    // Atomic increment. The guard on attempts means parallel requests
    // cannot push the counter past the maximum.
    await db
      .prepare(
        `UPDATE email_otps SET attempts = attempts + 1
         WHERE uid = ?1 AND attempts < ?2`
      )
      .bind(uid, OTP_MAX_ATTEMPTS)
      .run();

    const after = await db
      .prepare("SELECT attempts FROM email_otps WHERE uid = ?1")
      .bind(uid)
      .first<{ attempts: number }>();

    return {
      valid: false,
      reason: "invalid_otp",
      attemptsRemaining: Math.max(
        0,
        OTP_MAX_ATTEMPTS - (after?.attempts ?? attempts + 1)
      ),
    };
  }

  // Consume the code. Deleting before confirming prevents replay.
  await db.prepare("DELETE FROM email_otps WHERE uid = ?1").bind(uid).run();

  return { valid: true };
}

export async function invalidateOTP(env: Env, uid: string): Promise<void> {
  const db = requireDb(env);
  await db.prepare("DELETE FROM email_otps WHERE uid = ?1").bind(uid).run();
}

export type OtpStatus = {
  hasPendingOTP: boolean;
  expiresIn: number;
  attempts: number;
  lastSentAt: string | null;
  cooldownSeconds: number;
};

export async function checkOTPStatus(env: Env, uid: string): Promise<OtpStatus> {
  const db = requireDb(env);

  const row = await db
    .prepare(
      `SELECT expires_at, attempts, last_sent_at FROM email_otps WHERE uid = ?1`
    )
    .bind(uid)
    .first<{ expires_at: number; attempts: number; last_sent_at: number }>();

  if (!row) {
    return {
      hasPendingOTP: false,
      expiresIn: 0,
      attempts: 0,
      lastSentAt: null,
      cooldownSeconds: 0,
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const elapsedSeconds = row.last_sent_at
    ? now - row.last_sent_at
    : OTP_RESEND_COOLDOWN_SECONDS;

  return {
    hasPendingOTP: true,
    expiresIn: Math.max(0, row.expires_at - now) * 1000,
    attempts: row.attempts ?? 0,
    lastSentAt: row.last_sent_at
      ? new Date(row.last_sent_at * 1000).toISOString()
      : null,
    cooldownSeconds: Math.max(0, OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds),
  };
}

/** Removes OTP records that expired more than a day ago. */
export async function purgeExpiredOTPs(env: Env): Promise<void> {
  const db = requireDb(env);
  const cutoff = Math.floor(Date.now() / 1000) - 24 * 60 * 60;

  await db
    .prepare("DELETE FROM email_otps WHERE expires_at < ?1")
    .bind(cutoff)
    .run();
}

/**
 * Marks the Firebase account as email verified.
 *
 * email_verified is a reserved OIDC claim and cannot be set through custom
 * claims, so the Admin SDK user update API must be used instead.
 */
export async function markEmailVerified(env: Env, uid: string): Promise<void> {
  const { auth: firebaseAuth } = await ensureInitialized(env);
  await firebaseAuth.updateUser(uid, { emailVerified: true });
}
