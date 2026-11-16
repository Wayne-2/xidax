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

export function isFirebaseClientConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;

  if (!isFirebaseClientConfigured()) {
    throw new Error(
      "Firebase client is not configured. Set NEXT_PUBLIC_FIREBASE_* environment variables."
    );
  }

  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  authInstance = getAuth(app);

  return app;
}

export function getFirebaseAuth(): Auth {
  getFirebaseApp();
  if (!authInstance) {
    authInstance = getAuth(app!);
  }
  return authInstance;
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
  const auth = getFirebaseAuth();
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
    getFirebaseAuth(),
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
    getFirebaseAuth(),
    email,
    password
  );

  return credential.user;
}

export async function signOutFirebase() {
  await signOut(getFirebaseAuth());
}

export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(getFirebaseAuth(), email);
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
