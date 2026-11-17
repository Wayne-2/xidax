"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowIcon } from "@/components/BuildIcons";
import { useToast } from "@/components/ToastProvider";
import { loginAccount } from "@/lib/api";
import {
  fetchOtpStatus,
  getFirebaseAuth,
  getIdToken,
  reload,
  resendOtp,
  sendOtp,
  verifyOtp,
  type OtpApiError,
} from "@/lib/firebase-client";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyOtpPage() {
  const router = useRouter();
  const toast = useToast();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "verifying" | "verified">(
    "idle"
  );
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [attemptsUsed, setAttemptsUsed] = useState(0);

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const lastAttemptedRef = useRef<string | null>(null);

  const code = useMemo(() => digits.join(""), [digits]);
  const complete = code.length === OTP_LENGTH;

  const focusInput = useCallback((index: number) => {
    const input = inputsRef.current[index];
    if (input) {
      input.focus();
      input.select?.();
    }
  }, []);

  /* ---------------- countdown ---------------- */
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  /* ---------------- resend cooldown ---------------- */
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  /* ---------------- initial load: send or resume ---------------- */
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const idToken = await getIdToken();

        const existing = await fetchOtpStatus(idToken).catch(() => null);

        if (existing?.hasPendingOTP) {
          if (!cancelled) {
            setSecondsLeft(Math.max(0, Math.floor((existing.expiresIn ?? 0) / 1000)));
            setAttemptsUsed(existing.attempts ?? 0);
            setStatus("sent");
            const sinceLast = existing.lastSentAt
              ? Math.floor((Date.now() - new Date(existing.lastSentAt).getTime()) / 1000)
              : RESEND_COOLDOWN_SECONDS;
            setCooldown(Math.max(0, RESEND_COOLDOWN_SECONDS - sinceLast));
          }
          return;
        }

        if (!cancelled) {
          setStatus("sending");
          await sendOtp(idToken);
          if (!cancelled) {
            setStatus("sent");
            setSecondsLeft(5 * 60);
            setCooldown(RESEND_COOLDOWN_SECONDS);
            toast.success("We sent a 6-digit code to your email address.");
          }
        }
      } catch (err) {
        const apiError = err as OtpApiError;
        if (!cancelled) {
          setStatus("idle");
          setError(apiError.error ?? "We could not send a verification code.");
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  /* ---------------- input handling ---------------- */
  const handleVerify = useCallback(async (submitted?: string) => {
    const value = submitted ?? code;

    if (value.length !== OTP_LENGTH || status === "verifying") return;

    setStatus("verifying");
    setError("");

    try {
      const idToken = await getIdToken();
      await verifyOtp(idToken, value);

      // Refresh the Firebase session so emailVerified reflects the new state
      const currentUser = getFirebaseAuth().currentUser;
      if (currentUser) {
        await reload(currentUser).catch(() => undefined);
      }
      const fresh = await getIdToken(null, true);

      // Firebase is now verified. Exchange the fresh ID token for a D1
      // session so /api/me* works in the storefront.
      const session = await loginAccount(fresh);

      window.localStorage.setItem("generic-pcs.session", session.token);

      toast.success("Email verified. Welcome to Generic PCs.");

      // Full navigation is intentional: it re-initialises AccountProvider
      // with the freshly issued D1 session token.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/profile");
    } catch (err) {
      const apiError = err as OtpApiError;
      setStatus("sent");
      setError(apiError.error ?? "That code did not work. Please try again.");
      setDigits(Array(OTP_LENGTH).fill(""));
      setAttemptsUsed((value) => value + 1);
      lastAttemptedRef.current = null;
      focusInput(0);
    }
  }, [code, focusInput, router, status, toast]);

  const setDigit = useCallback(
    (index: number, value: string) => {
      const clean = value.replace(/\D/g, "");

      const apply = (next: string[]) => {
        setDigits(next);

        const nextCode = next.join("");

        if (nextCode.length === OTP_LENGTH && lastAttemptedRef.current !== nextCode) {
          lastAttemptedRef.current = nextCode;
          void handleVerify(nextCode);
        }
      };

      if (!clean) {
        const next = [...digits];
        next[index] = "";
        apply(next);
        return;
      }

      const next = [...digits];

      if (clean.length > 1) {
        // Multi digit paste starting at this index
        for (let offset = 0; offset < clean.length && index + offset < OTP_LENGTH; offset += 1) {
          next[index + offset] = clean[offset];
        }
        const last = Math.min(index + clean.length, OTP_LENGTH - 1);
        focusInput(last);
        apply(next);
        return;
      }

      next[index] = clean;
      if (index < OTP_LENGTH - 1) {
        focusInput(index + 1);
      }
      apply(next);
    },
    [digits, focusInput, handleVerify]
  );

  const handleChange = useCallback(
    (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setDigit(index, event.target.value);
    },
    [setDigit]
  );

  const handleKeyDown = useCallback(
    (index: number) => (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Backspace") {
        event.preventDefault();

        if (digits[index]) {
          const next = [...digits];
          next[index] = "";
          setDigits(next);
          return;
        }

        if (index > 0) {
          const next = [...digits];
          next[index - 1] = "";
          setDigits(next);
          focusInput(index - 1);
        }
        return;
      }

      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        focusInput(index - 1);
        return;
      }

      if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
        event.preventDefault();
        focusInput(index + 1);
      }
    },
    [digits, focusInput]
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      const text = event.clipboardData.getData("text") || "";
      const clean = text.replace(/\D/g, "").slice(0, OTP_LENGTH);
      if (!clean) return;

      const next = Array(OTP_LENGTH).fill("");
      for (let index = 0; index < clean.length; index += 1) {
        next[index] = clean[index];
      }
      setDigits(next);

      focusInput(Math.min(clean.length, OTP_LENGTH - 1));

      const pasted = next.join("");
      if (pasted.length === OTP_LENGTH && lastAttemptedRef.current !== pasted) {
        lastAttemptedRef.current = pasted;
        void handleVerify(pasted);
      }
    },
    [focusInput, handleVerify]
  );




  /* ---------------- resend ---------------- */
  const handleResend = useCallback(async () => {
    if (status === "sending" || cooldown > 0) return;

    setStatus("sending");
    setError("");

    try {
      const idToken = await getIdToken();
      await resendOtp(idToken);

      setStatus("sent");
      setSecondsLeft(5 * 60);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setAttemptsUsed(0);
      lastAttemptedRef.current = null;
      setDigits(Array(OTP_LENGTH).fill(""));
      focusInput(0);
      toast.success("We sent a new code to your email address.");
    } catch (err) {
      const apiError = err as OtpApiError;
      setStatus("sent");
      setError(apiError.error ?? "We could not send a new code. Please try again.");
    }
  }, [cooldown, focusInput, status, toast]);

  /* ---------------- render ---------------- */
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const inputClass =
    "h-14 w-full rounded-xl border bg-[#f8fafe] text-center text-2xl font-bold tracking-widest text-[#2e3338] outline-none transition-colors focus:border-[#5865F2] focus:ring-2 focus:ring-[#5865F2]/20 disabled:opacity-60";

  return (
    <main className="relative flex flex-1 flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(88,101,242,0.12),transparent_60%)]"
      />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-12 pt-10 sm:px-6 sm:pt-14">
        <div className="text-center">
          <div
            aria-hidden="true"
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5865F2]/10 text-[#5865F2]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </div>

          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-[#2e3338] sm:text-3xl">
            Verify your email
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#5c5e66]">
            {status === "sending"
              ? "Sending your verification code…"
              : "Enter the 6-digit code we sent to your email address."}
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-5 shadow-card sm:p-7">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleVerify();
            }}
            noValidate
          >
            <div className="grid grid-cols-6 gap-2" role="group" aria-label="Verification code">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(node) => {
                    inputsRef.current[index] = node;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  pattern="[0-9]*"
                  maxLength={1}
                  aria-label={`Digit ${index + 1}`}
                  value={digit}
                  disabled={status === "sending" || status === "verifying"}
                  onChange={handleChange(index)}
                  onKeyDown={handleKeyDown(index)}
                  onPaste={handlePaste}
                  onFocus={(event) => event.currentTarget.select()}
                  className={`${inputClass} ${
                    error ? "border-[#DC2626]" : "border-[#d2dbe8]"
                  }`}
                />
              ))}
            </div>

            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/10 px-3.5 py-2.5 text-xs font-medium text-[#B91C1C]"
              >
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex items-center justify-between gap-3 text-xs">
              <span className="text-[#80848e]">
                {secondsLeft > 0 ? (
                  <>
                    Code expires in{" "}
                    <span className="font-semibold text-[#5c5e66]">
                      {minutes}:{String(seconds).padStart(2, "0")}
                    </span>
                  </>
                ) : status === "verified" ? (
                  "Verified"
                ) : (
                  "Code expired"
                )}
              </span>

              {attemptsUsed > 0 && attemptsUsed < 5 ? (
                <span className="text-[#80848e]">
                  {5 - attemptsUsed} attempt{5 - attemptsUsed === 1 ? "" : "s"} left
                </span>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={!complete || status === "verifying" || status === "sending"}
              className="mt-5 inline-flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "verifying" ? "Verifying…" : "Verify email"}
              {status !== "verifying" && <ArrowIcon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || status === "sending" || status === "verifying"}
              className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-[#5865F2] transition-colors hover:bg-[#dce3ee]/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cooldown > 0
                ? `Resend code in ${cooldown}s`
                : status === "sending"
                  ? "Sending…"
                  : "Resend code"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[#5c5e66]">
          Wrong address?{" "}
          <Link
            href="/signup"
            className="font-semibold text-[#5865F2] transition-colors hover:text-[#4752C4]"
          >
            Create another account
          </Link>
        </p>
      </div>
    </main>
  );
}

