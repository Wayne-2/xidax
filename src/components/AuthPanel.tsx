import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import AuthForm, { type AuthMode } from "@/components/AuthForm";

function BackIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
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
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export default function AuthPanel({ mode }: { mode: AuthMode }) {
  const isSignIn = mode === "signin";

  return (
    <main className="relative flex flex-1 flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(88,101,242,0.12),transparent_60%)]"
      />

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-12 pt-5 sm:px-6 sm:pt-8">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#dce3ee] bg-[#eaf0f8] px-3.5 py-2 text-xs font-semibold text-[#5c5e66] transition-colors hover:border-[#5865F2]/50 hover:text-[#2e3338] sm:px-4"
        >
          <BackIcon />
          Back to store
        </Link>

        <Link
          href="/"
          className="mx-auto mt-8 flex items-center justify-center transition-opacity hover:opacity-80 sm:mt-10"
        >
          <Image
            src="/Genericpcs.png"
            alt="generic pcs"
            width={1329}
            height={292}
            priority
            className="h-11 w-auto"
          />
        </Link>

        <div className="mt-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#2e3338] sm:text-4xl">
            {isSignIn ? "Sign in" : "Create your account"}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#5c5e66]">
            {isSignIn
              ? "Access your orders, saved builds and lifetime support."
              : "One account for orders, saved builds and priority support."}
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-5 shadow-card sm:p-7">
          <Suspense fallback={null}>
            <AuthForm mode={mode} />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-sm text-[#5c5e66]">
          {isSignIn ? "New to generic pcs?" : "Already have an account?"}{" "}
          <Link
            href={isSignIn ? "/signup" : "/login"}
            className="font-semibold text-[#5865F2] transition-colors hover:text-[#4752C4]"
          >
            {isSignIn ? "Create an account" : "Sign in"}
          </Link>
        </p>
      </div>
    </main>
  );
}
