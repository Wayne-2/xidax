"use client";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirebaseAppAsync } from "@/lib/firebase-client";
import { fetchAdminUserStats } from "@/lib/admin-api";

const ADMIN_SESSION_KEY = "genericpcs.admin.session";

/** Returns the Firebase Auth instance for the shared project. */
async function adminAuth(): Promise<Auth> {
  return getAuth(await getFirebaseAppAsync());
}

/** True only when the dedicated admin sign-in flow has been completed. */
export function hasAdminSession(): boolean {
  if (typeof window === "undefined") return false;

  return window.localStorage.getItem(ADMIN_SESSION_KEY) === "1";
}

export function setAdminSession() {
  window.localStorage.setItem(ADMIN_SESSION_KEY, "1");
  // Mirror into a cookie so Next.js middleware can gate the admin shell.
  // This is a UI hint only — the Worker API is the authoritative gate.
  document.cookie = `genericpcs.admin.session=1; path=/; max-age=604800; samesite=lax`;
}

export function clearAdminSession() {
  window.localStorage.removeItem(ADMIN_SESSION_KEY);
  document.cookie =
    "genericpcs.admin.session=; path=/; max-age=0; samesite=lax";
}

/**
 * Verifies the current Firebase user against the server-side admin allowlist.
 * Throws with { status } on failure so callers can distinguish 401 from 403.
 */
export async function verifyAdminAccess(): Promise<void> {
  await fetchAdminUserStats();
}

/** Signs in through the dedicated admin flow and records the admin session. */
export async function adminSignIn(email: string, password: string) {
  await signInWithEmailAndPassword(await adminAuth(), email.trim(), password);
  await verifyAdminAccess();
  setAdminSession();
}

/** Signs out of Firebase and clears the admin session flag. */
export async function adminSignOut() {
  clearAdminSession();
  await signOut(await adminAuth());
}

/** Observes Firebase auth state for the admin flow. */
export async function observeAdminAuth(
  callback: (user: User | null) => void
): Promise<() => void> {
  const auth = await adminAuth();
  return onAuthStateChanged(auth, callback);
}

/** Returns the signed-in Firebase user, if any. */
export async function currentAdminUser(): Promise<User | null> {
  return (await adminAuth()).currentUser;
}
