"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowIcon } from "@/components/BuildIcons";
import {
  adminSignIn,
  hasAdminSession,
  verifyAdminAccess,
} from "@/lib/admin-auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  // If an admin session already exists, verify it and go straight in.
  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        if (hasAdminSession()) {
          await verifyAdminAccess();
          if (!cancelled) router.replace("/admin");
        }
      } catch {
        // Stale session — clear it below.
        if (!cancelled) window.localStorage.removeItem("genericpcs.admin.session");
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await adminSignIn(email, password);
      router.replace("/admin");
    } catch (err) {
      const status = (err as { status?: number }).status;

      if (status === 403) {
        setError("This account is not authorised to access the admin dashboard.");
      } else if (status === 401) {
        setError("Session could not be verified. Please try again.");
      } else {
        const code = (err as { code?: string }).code ?? "";

        if (code === "auth/invalid-credential") {
          setError("Incorrect email or password.");
        } else if (code === "auth/user-not-found") {
          setError("No account found with that email.");
        } else if (code === "auth/wrong-password") {
          setError("Incorrect password.");
        } else if (code === "auth/too-many-requests") {
          setError("Too many attempts. Please wait a moment and try again.");
        } else {
          setError((err as { error?: string })?.error ?? "Could not sign in. Please try again.");
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f4fa]">
        <p className="text-sm text-[#5c5e66]">Checking admin session…</p>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#f0f4fa] px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(88,101,242,0.14),transparent_60%)]"
      />

      <div className="relative w-full max-w-md">
        <div className="text-center">
          <Link href="/" className="inline-block text-2xl font-extrabold tracking-tight">
            Generic<span className="text-[#5865F2]">PCs</span>
          </Link>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#80848e]">
            Administration
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-[#dce3ee] bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5865F2]/10 text-[#5865F2]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <h1 className="text-xl font-bold text-[#2e3338]">Admin sign in</h1>
              <p className="text-xs text-[#80848e]">Restricted to authorised staff.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
                Email address
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@genericpcs.com"
                autoComplete="username"
                className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-3.5 text-sm outline-none transition-colors focus:border-[#5865F2]"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#80848e]">
                Password
              </span>
              <span className="relative block">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-3.5 pr-12 text-sm outline-none transition-colors focus:border-[#5865F2]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-xs font-semibold text-[#80848e] hover:bg-[#dce3ee]/60"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </span>
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/10 px-3.5 py-2.5 text-xs font-medium text-[#B91C1C]"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign in to dashboard"}
              {!submitting && <ArrowIcon className="h-4 w-4" />}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-[#80848e]">
          <Link href="/" className="font-semibold text-[#5865F2] hover:text-[#4752C4]">
            ← Back to store
          </Link>
        </p>
      </div>
    </main>
  );
}
