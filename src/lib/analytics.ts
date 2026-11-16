"use client";

import { getFirebaseApp } from "@/lib/firebase-client";

/**
 * Google Analytics for the storefront.
 *
 * Analytics is opt-in and loaded lazily so that:
 *  - it never runs during server rendering
 *  - it is not pulled into the initial bundle
 *  - it stays off until consent has been recorded
 *
 * Enable it by setting NEXT_PUBLIC_ENABLE_ANALYTICS=true and only after your
 * cookie banner covers analytics cookies.
 */

export function analyticsEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true";
}

let loaded = false;

/** Loads Analytics and returns the instance, or null when it is unavailable. */
export async function loadAnalytics(): Promise<unknown | null> {
  if (!analyticsEnabled()) return null;
  if (typeof window === "undefined") return null;
  if (loaded) return null;

  try {
    const { getAnalytics } = await import("firebase/analytics");
    const analytics = getAnalytics(getFirebaseApp());
    loaded = true;
    return analytics;
  } catch (error) {
    console.warn("Analytics could not be initialised:", error);
    return null;
  }
}

/** Records a page view for the given path. */
export async function trackPageView(path: string) {
  const analytics = (await loadAnalytics()) as
    | { logEvent: (name: string, params?: Record<string, unknown>) => void }
    | null;

  if (!analytics) return;

  analytics.logEvent("page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
