"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowIcon } from "@/components/BuildIcons";
import { useToast } from "@/components/ToastProvider";
import { requestPasswordReset } from "@/lib/firebase-client";

export default function ResetPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;

    setSending(true);

    try {
      await requestPasswordReset(email.trim());
      setSent(true);
      toast.success("Password reset email sent. Check your inbox.");
    } catch (error) {
      const code = (error as { code?: string }).code ?? "";
      if (code === "auth/user-not-found") {
        toast.error("No account found with that email address.");
      } else if (code === "auth/invalid-email") {
        toast.error("That email address does not look right.");
      } else {
        toast.error("Could not send the reset email. Please try again.");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="relative flex flex-1 flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(88,101,242,0.12),transparent_60%)]"
      />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-12 pt-10 sm:px-6 sm:pt-14">
        <div className="text-center">
          <Link href="/" className="inline-block text-2xl font-extrabold tracking-tight">
            Generic<span className="text-[#5865F2]">PCs</span>
          </Link>
          <h1 className="mt-8 text-2xl font-extrabold tracking-tight text-[#2e3338] sm:text-3xl">
            Reset your password
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#5c5e66]">
            Enter your email and we&apos;ll send you a link to choose a new password.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-5 shadow-card sm:p-7">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 text-xl">✓</div>
              <p className="mt-4 text-sm font-semibold text-[#2e3338]">Check your inbox</p>
              <p className="mt-2 text-sm text-[#5c5e66]">
                If an account exists for <span className="font-semibold">{email}</span>, a reset link is on its way.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white hover:bg-[#4752C4]"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]">
                  Email address
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-11 w-full rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-3.5 text-sm outline-none focus:border-[#5865F2]"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={sending || !email.trim()}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white hover:bg-[#4752C4] disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send reset link"}
                {!sending && <ArrowIcon className="h-4 w-4" />}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-[#5c5e66]">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-[#5865F2] hover:text-[#4752C4]">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
