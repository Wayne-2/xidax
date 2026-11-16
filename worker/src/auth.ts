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
import {
  getFirestore as getAdminFirestore,
  type Firestore,
  Timestamp,
  FieldValue,
} from "firebase-admin/firestore";

let app: App | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

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

export function getFirestore(): Firestore {
  if (!firestore) {
    throw new Error("Firebase Firestore is not initialised.");
  }
  return firestore;
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
    clientEmail: pick("clientEmail", "client_email"),
    privateKey,
  };
}

/** Initialises the Firebase Admin SDK once per isolate. */
export async function ensureInitialized(env: Env) {
  if (auth && firestore) {
    return { auth, firestore };
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
  firestore = getAdminFirestore(app);

  return { auth, firestore };
}

/* ------------------------------------------------------------------ */
/* Tokens and sessions                                                   */
/* ------------------------------------------------------------------ */

export function randomToken(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  const hexChars = "0123456789abcdef";
  let token = "";
  for (let i = 0; i < length * 2; i += 1) {
    token += hexChars[bytes[i] % 16];
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
  const { firestore: db } = await ensureInitialized(env);
  const doc = await db.collection("users").doc(token).get();

  if (!doc.exists) return null;

  const data = doc.data() as StoredUser | null;
  if (!data) return null;

  return data;
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

export async function createSession(_env: Env, userId: string) {
  const token = randomToken(32);
  return {
    token,
    expiresAt: new Date(
      Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
    ).toISOString(),
  };
}

export async function ensureSettings(env: Env, userId: string) {
  const { firestore: db } = await ensureInitialized(env);

  const docRef = db.collection("user_settings").doc(userId);
  const snap = await docRef.get();

  if (snap.exists) {
    const data = snap.data() as {
      order_updates: boolean;
      drop_notifications: boolean;
      marketing_emails: boolean;
      language: string;
      currency: string;
    };

    return {
      orderUpdates: data.order_updates ?? true,
      dropNotifications: data.drop_notifications ?? true,
      marketingEmails: data.marketing_emails ?? false,
      language: data.language ?? "English (Nigeria)",
      currency: data.currency ?? "USD ($)",
    };
  }

  await docRef.set({
    order_updates: true,
    drop_notifications: true,
    marketing_emails: false,
    language: "English (Nigeria)",
    currency: "USD ($)",
  });

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
    throw new Error("OTP_SECRET must be set to a value of at least 16 characters.");
  }

  return pepper;
}

/* ------------------------------------------------------------------ */
/* OTP storage (Firebase Firestore)                                      */
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

export async function storeOTP(
  env: Env,
  uid: string,
  email: string,
  otp: string
): Promise<void> {
  const { firestore: db } = await ensureInitialized(env);

  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(Date.now() + OTP_TTL_MS);

  await db
    .collection("email_otps")
    .doc(uid)
    .set(
      {
        uid,
        email,
        otp_hash: await hashOTP(otp, otpPepper(env)),
        expires_at: expiresAt,
        attempts: 0,
        last_sent_at: now,
        created_at: now,
      },
      { merge: true }
    );
}

export async function verifyOTP(
  env: Env,
  uid: string,
  submittedOTP: string
): Promise<OtpVerificationResult> {
  const { firestore: db } = await ensureInitialized(env);
  const docRef = db.collection("email_otps").doc(uid);
  const doc = await docRef.get();

  if (!doc.exists) {
    return { valid: false, reason: "not_found" };
  }

  const data = doc.data();
  if (!data) {
    return { valid: false, reason: "not_found" };
  }

  const attempts = typeof data.attempts === "number" ? data.attempts : 0;

  if (attempts >= OTP_MAX_ATTEMPTS) {
    await docRef.delete();
    return { valid: false, reason: "max_attempts" };
  }

  const expiresAt = data.expires_at as Timestamp | undefined;
  const expiryMillis =
    expiresAt && typeof expiresAt.toMillis === "function"
      ? expiresAt.toMillis()
      : (data.expires_at as number | undefined) ?? 0;

  if (expiryMillis < Date.now()) {
    await docRef.delete();
    return { valid: false, reason: "expired" };
  }

  const storedHash = typeof data.otp_hash === "string" ? data.otp_hash : "";
  const submittedHash = await hashOTP(submittedOTP, otpPepper(env));

  if (!safeCompare(storedHash, submittedHash)) {
    // Atomic increment so parallel failures cannot skip the attempt cap.
    await docRef.update({ attempts: FieldValue.increment(1) });
    return {
      valid: false,
      reason: "invalid_otp",
      attemptsRemaining: Math.max(0, OTP_MAX_ATTEMPTS - (attempts + 1)),
    };
  }

  // Consume the OTP. Deleting before confirming prevents replay.
  await docRef.delete();

  return { valid: true };
}

export async function invalidateOTP(env: Env, uid: string): Promise<void> {
  const { firestore: db } = await ensureInitialized(env);
  await db.collection("email_otps").doc(uid).delete();
}

export type OtpStatus = {
  hasPendingOTP: boolean;
  expiresIn: number;
  attempts: number;
  lastSentAt: string | null;
  cooldownSeconds: number;
};

export async function checkOTPStatus(env: Env, uid: string): Promise<OtpStatus> {
  const { firestore: db } = await ensureInitialized(env);
  const doc = await db.collection("email_otps").doc(uid).get();

  if (!doc.exists) {
    return {
      hasPendingOTP: false,
      expiresIn: 0,
      attempts: 0,
      lastSentAt: null,
      cooldownSeconds: 0,
    };
  }

  const data = doc.data();
  const expiresAt = data?.expires_at as Timestamp | undefined;
  const expiryMillis =
    expiresAt && typeof expiresAt.toMillis === "function"
      ? expiresAt.toMillis()
      : (data?.expires_at as number | undefined) ?? 0;

  const lastSentAt = data?.last_sent_at as
    | Timestamp
    | undefined;
  const lastSentMillis =
    lastSentAt && typeof lastSentAt.toMillis === "function"
      ? lastSentAt.toMillis()
      : (lastSentAt as number | undefined) ?? 0;

  const elapsedSeconds = lastSentMillis
    ? Math.floor((Date.now() - lastSentMillis) / 1000)
    : OTP_RESEND_COOLDOWN_SECONDS;

  return {
    hasPendingOTP: true,
    expiresIn: Math.max(0, expiryMillis - Date.now()),
    attempts: typeof data?.attempts === "number" ? data.attempts : 0,
    lastSentAt: lastSentMillis ? new Date(lastSentMillis).toISOString() : null,
    cooldownSeconds: Math.max(
      0,
      OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds
    ),
  };
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
