"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowIcon, CheckIcon } from "@/components/BuildIcons";
import { useAccount } from "@/components/AccountProvider";

type Mode = "signin" | "signup";

type Field = "name" | "email" | "password" | "confirm" | "terms";

type Errors = Partial<Record<Field, string>>;

function EyeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function LockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export default function AuthForm() {
  const router = useRouter();
  const { user, ready, signIn, signUp } = useAccount();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (ready && user) {
      router.replace("/profile");
    }
  }, [ready, user, router]);

  function switchMode(next: Mode) {
    setMode(next);
    setErrors({});
  }

  function validate(): Errors {
    const next: Errors = {};

    if (mode === "signup" && !name.trim()) {
      next.name = "Tell us what to call you.";
    }

    if (!email.trim()) {
      next.email = "We need an email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "That email address does not look right.";
    }

    if (!password) {
      next.password = "Enter your password.";
    } else if (mode === "signup" && password.length < 8) {
      next.password = "Use at least 8 characters.";
    }

    if (mode === "signup") {
      if (!confirm) {
        next.confirm = "Re-enter your password.";
      } else if (confirm !== password) {
        next.confirm = "Those passwords do not match.";
      }

      if (!terms) {
        next.terms = "Accept the terms to continue.";
      }
    }

    return next;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validate();

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    window.setTimeout(() => {
      if (mode === "signin") {
        signIn(email);
      } else {
        signUp(name, email);
      }

      router.push("/profile");
    }, 650);
  }

  function useDemoAccount() {
    setSubmitting(true);

    window.setTimeout(() => {
      signIn("");
      router.push("/profile");
    }, 450);
  }

  const inputClass =
    "h-11 w-full rounded-xl border bg-[#f8fafe] px-3.5 text-sm text-[#2e3338] outline-none transition-colors placeholder:text-[#80848e]";

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-5 sm:p-7">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-[#d2dbe8] bg-[#f0f4fa] p-1">
          {(
            [
              { value: "signin", label: "Sign in" },
              { value: "signup", label: "Create account" },
            ] as { value: Mode; label: string }[]
          ).map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => switchMode(tab.value)}
              aria-pressed={mode === tab.value}
              className={`h-10 rounded-lg text-sm font-semibold transition-colors ${
                mode === tab.value
                  ? "bg-[#5865F2] text-white shadow-sm"
                  : "text-[#5c5e66] hover:text-[#2e3338]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          {mode === "signup" && (
            <div>
              <label
                htmlFor="auth-name"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
              >
                Full name
              </label>
              <input
                id="auth-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Wayne Adebayo"
                autoComplete="name"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "auth-name-error" : undefined}
                className={`${inputClass} ${
                  errors.name ? "border-[#DC2626]" : "border-[#d2dbe8]"
                }`}
              />
              {errors.name && (
                <p id="auth-name-error" className="mt-1.5 text-xs text-[#DC2626]">
                  {errors.name}
                </p>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
            >
              Email address
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "auth-email-error" : undefined}
              className={`${inputClass} ${
                errors.email ? "border-[#DC2626]" : "border-[#d2dbe8]"
              }`}
            />
            {errors.email && (
              <p id="auth-email-error" className="mt-1.5 text-xs text-[#DC2626]">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label
                htmlFor="auth-password"
                className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
              >
                Password
              </label>
              {mode === "signin" && (
                <Link
                  href="/support"
                  className="text-[11px] font-semibold text-[#5865F2] transition-colors hover:text-[#4752C4]"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? "auth-password-error" : undefined
                }
                className={`${inputClass} pr-11 ${
                  errors.password ? "border-[#DC2626]" : "border-[#d2dbe8]"
                }`}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#80848e] transition-colors hover:bg-[#dce3ee] hover:text-[#2e3338]"
              >
                <EyeIcon className="h-4 w-4" />
              </button>
            </div>
            {errors.password && (
              <p
                id="auth-password-error"
                className="mt-1.5 text-xs text-[#DC2626]"
              >
                {errors.password}
              </p>
            )}
          </div>

          {mode === "signup" && (
            <div>
              <label
                htmlFor="auth-confirm"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
              >
                Confirm password
              </label>
              <input
                id="auth-confirm"
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirm)}
                aria-describedby={
                  errors.confirm ? "auth-confirm-error" : undefined
                }
                className={`${inputClass} ${
                  errors.confirm ? "border-[#DC2626]" : "border-[#d2dbe8]"
                }`}
              />
              {errors.confirm && (
                <p
                  id="auth-confirm-error"
                  className="mt-1.5 text-xs text-[#DC2626]"
                >
                  {errors.confirm}
                </p>
              )}
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-[#5c5e66]">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(event) => setTerms(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#5865F2]"
                />
                <span>
                  I agree to the Pcmart terms of sale and the privacy policy.
                </span>
              </label>
              {errors.terms && (
                <p className="mt-1.5 text-xs text-[#DC2626]">{errors.terms}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting
              ? "One moment…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
            {!submitting && <ArrowIcon className="h-4 w-4" />}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-[#d2dbe8]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#80848e]">
            or
          </span>
          <span className="h-px flex-1 bg-[#d2dbe8]" />
        </div>

        <button
          type="button"
          onClick={useDemoAccount}
          disabled={submitting}
          className="inline-flex h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-[#d2dbe8] bg-[#f8fafe] px-5 text-sm font-semibold text-[#4e5058] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338] disabled:opacity-70"
        >
          <LockIcon className="h-4 w-4" />
          Continue with a demo account
        </button>

        <p className="mt-5 text-center text-xs leading-relaxed text-[#80848e]">
          {mode === "signin" ? (
            <>
              New to Pcmart?{" "}
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="font-semibold text-[#5865F2] transition-colors hover:text-[#4752C4]"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="font-semibold text-[#5865F2] transition-colors hover:text-[#4752C4]"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>

      <ul className="mt-5 space-y-2 px-1">
        {[
          "Orders, builds and saved configurations in one place",
          "Lifetime labour coverage on every machine",
          "Priority support line for account holders",
        ].map((benefit) => (
          <li
            key={benefit}
            className="flex items-start gap-2 text-xs leading-relaxed text-[#5c5e66]"
          >
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#5865F2]/10 text-[#5865F2]">
              <CheckIcon className="h-2.5 w-2.5" />
            </span>
            {benefit}
          </li>
        ))}
      </ul>
    </div>
  );
}
