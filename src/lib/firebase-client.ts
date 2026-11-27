"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  isSignInWithEmailLink,
  signOut,
  onAuthStateChanged,
  updateProfile,
  reload,
  type Auth,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let configPromise: Promise<Record<string, string>> | null = null;

function hasConfig(config: Record<string, string | undefined>) {
  return Boolean(config.apiKey && config.projectId && config.appId);
}

/**
 * Loads the Firebase web config at runtime from the API Worker.
 *
 * Firebase web config is public by design. Fetching it at runtime avoids
 * breakages when a site build is produced without the NEXT_PUBLIC_* env vars.
 * Build-time values are used as a first choice, so nothing changes in dev.
 */
async function loadFirebaseConfig(): Promise<Record<string, string>> {
  if (!configPromise) {
    configPromise = (async () => {
      let runtime: Record<string, string> = {};

      try {
        const response = await fetch(`${API_BASE}/api/config`, { cache: "no-store" });
        if (response.ok) {
          const payload = (await response.json()) as {
            firebase?: Record<string, string>;
          };
          runtime = payload.firebase ?? {};
        }
      } catch {
        // Use build-time values if the API is unreachable.
      }

      const merged: Record<string, string> = {};

      for (const key of Object.keys(firebaseConfig)) {
        const buildValue = firebaseConfig[key as keyof typeof firebaseConfig];
        merged[key] = buildValue || runtime[key] || "";
      }

      if (!hasConfig(merged)) {
        throw new Error(
          "Firebase client is not configured. Check the API Worker FIREBASE_CONFIG secret."
        );
      }

      return merged;
    })().catch((err) => {
      configPromise = null; // allow retry after transient failure
      throw err;
    });
  }

  return configPromise;
}

/** Initialises Firebase with runtime-loaded config. Safe to call repeatedly. */
export async function initFirebase(): Promise<FirebaseApp> {
  if (app) return app;

  const config = await loadFirebaseConfig();

  app = getApps().length ? getApps()[0] : initializeApp(config);
  authInstance = getAuth(app);

  return app;
}

/** Synchronous accessor. Call initFirebase() first in async contexts. */
export function getFirebaseApp(): FirebaseApp {
  if (app) return app;

  if (hasConfig(firebaseConfig)) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    return app;
  }

  throw new Error("Firebase not initialised. Call initFirebase() first.");
}

export async function getFirebaseAppAsync(): Promise<FirebaseApp> {
  return initFirebase();
}

export async function getFirebaseAuthAsync(): Promise<Auth> {
  await initFirebase();
  return authInstance!;
}

/** Synchronous accessor for already-initialised auth. */
export function getFirebaseAuth(): Auth {
  if (!authInstance) getFirebaseApp();
  return authInstance!;
}

/** True when build-time config exists (used only to skip early warnings). */
export function isFirebaseClientConfigured() {
  return hasConfig(firebaseConfig);
}

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://generic-pcs-api.pcmarketweb.workers.dev"
).replace(/\/+$/, "");

export type OtpApiError = {
  error: string;
  status: number;
  code?: string;
  cooldown?: boolean;
};

async function otpRequest<T>(
  path: string,
  body: Record<string, unknown>,
  token: string
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string; code?: string; cooldown?: boolean })
    | null;

  if (!response.ok) {
    const error: OtpApiError = {
      error: payload?.error ?? "Something went wrong. Please try again.",
      status: response.status,
      code: payload?.code,
      cooldown: payload?.cooldown,
    };
    throw error;
  }

  return payload as T;
}

/** Returns a fresh Firebase ID token for the signed-in user. */
export async function getIdToken(user?: User | null, forceRefresh = false): Promise<string> {
  const auth = await getFirebaseAuthAsync();
  const current = user ?? auth.currentUser;

  if (!current) {
    throw new Error("You need to be signed in to continue.");
  }

  return current.getIdToken(forceRefresh);
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
) {
  const credential = await createUserWithEmailAndPassword(
    await getFirebaseAuthAsync(),
    email,
    password
  );

  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }

  return credential.user;
}

export async function signInWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(
    await getFirebaseAuthAsync(),
    email,
    password
  );

  return credential.user;
}

export async function signOutFirebase() {
  await signOut(await getFirebaseAuthAsync());
}

export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(await getFirebaseAuthAsync(), email);
}

export { isSignInWithEmailLink, onAuthStateChanged, reload };

export type { User };

/* ------------------------------------------------------------------ */
/* OTP API helpers                                                      */
/* ------------------------------------------------------------------ */

export type SendOtpResult = { success: boolean; message?: string };

export async function sendOtp(idToken: string): Promise<SendOtpResult> {
  return otpRequest<SendOtpResult>("/api/auth/send-otp", { idToken }, idToken);
}

export async function resendOtp(idToken: string): Promise<SendOtpResult> {
  return otpRequest<SendOtpResult>("/api/auth/resend-otp", { idToken }, idToken);
}

export async function verifyOtp(
  idToken: string,
  otp: string
): Promise<{ success: boolean; verified: boolean }> {
  return otpRequest<{ success: boolean; verified: boolean }>(
    "/api/auth/verify-otp",
    { idToken, otp },
    idToken
  );
}

export type OtpStatus = {
  hasPendingOTP: boolean;
  expiresIn?: number;
  attempts?: number;
  lastSentAt?: string;
};

export async function fetchOtpStatus(idToken: string): Promise<OtpStatus> {
  const response = await fetch(`${API_BASE}/api/auth/status`, {
    headers: { authorization: `Bearer ${idToken}` },
  });

  if (!response.ok) {
    throw {
      error: "Could not read verification status.",
      status: response.status,
    } satisfies OtpApiError;
  }

  return (await response.json()) as OtpStatus;
}

/** Permanently deletes the signed-in Firebase account and all its data. */
export async function deleteAccount(): Promise<void> {
  const idToken = await getIdToken(null, true);

  const response = await fetch(`${API_BASE}/api/auth/delete`, {
    method: "POST",
    headers: { authorization: `Bearer ${idToken}` },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw { error: payload?.error ?? "Could not delete your account.", status: response.status } satisfies OtpApiError;
  }
}
