"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowIcon } from "@/components/BuildIcons";
import { useAccount } from "@/components/AccountProvider";
import { countries } from "@/data/account";

export type AuthMode = "signin" | "signup";

type Field =
  | "name"
  | "email"
  | "country"
  | "postal"
  | "password"
  | "confirm"
  | "terms";

type Errors = Partial<Record<Field, string>>;

function ChevronIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

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

export default function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const { user, ready, signIn, signUp } = useAccount();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [country, setCountry] = useState("");
  const [postal, setPostal] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (ready && user) {
      router.replace("/profile");
    }
  }, [ready, user, router]);

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

    if (mode === "signup") {
      if (!country) {
        next.country = "Choose your country.";
      }

      if (!postal.trim()) {
        next.postal = "Enter your postal code.";
      } else if (!/^[a-z0-9][a-z0-9\s-]{2,9}$/i.test(postal.trim())) {
        next.postal = "Enter a valid postal code.";
      }
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
        signUp(name, email, country, postal);
      }

      router.push("/profile");
    }, 650);
  }

  const inputClass =
    "h-11 w-full rounded-xl border bg-[#f8fafe] px-3.5 text-sm text-[#2e3338] outline-none transition-colors placeholder:text-[#80848e]";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
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

      {mode === "signup" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="auth-country"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
            >
              Country
            </label>
            <div className="relative">
              <select
                id="auth-country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                autoComplete="country-name"
                aria-invalid={Boolean(errors.country)}
                aria-describedby={
                  errors.country ? "auth-country-error" : undefined
                }
                className={`${inputClass} appearance-none pr-9 ${
                  errors.country ? "border-[#DC2626]" : "border-[#d2dbe8]"
                }`}
              >
                <option value="">Select country</option>
                {countries.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#80848e]"
              >
                <ChevronIcon className="h-4 w-4" />
              </span>
            </div>
            {errors.country && (
              <p
                id="auth-country-error"
                className="mt-1.5 text-xs text-[#DC2626]"
              >
                {errors.country}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="auth-postal"
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#80848e]"
            >
              Postal code
            </label>
            <input
              id="auth-postal"
              value={postal}
              onChange={(event) => setPostal(event.target.value)}
              placeholder="100001"
              autoComplete="postal-code"
              inputMode="text"
              aria-invalid={Boolean(errors.postal)}
              aria-describedby={
                errors.postal ? "auth-postal-error" : undefined
              }
              className={`${inputClass} ${
                errors.postal ? "border-[#DC2626]" : "border-[#d2dbe8]"
              }`}
            />
            {errors.postal && (
              <p
                id="auth-postal-error"
                className="mt-1.5 text-xs text-[#DC2626]"
              >
                {errors.postal}
              </p>
            )}
          </div>
        </div>
      )}

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
            placeholder={
              mode === "signup" ? "At least 8 characters" : "••••••••"
            }
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
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
          <p id="auth-password-error" className="mt-1.5 text-xs text-[#DC2626]">
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
            aria-describedby={errors.confirm ? "auth-confirm-error" : undefined}
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
  );
}
