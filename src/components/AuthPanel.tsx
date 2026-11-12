import Image from "next/image";
import Link from "next/link";
import AuthForm, { type AuthMode } from "@/components/AuthForm";

export default function AuthPanel({ mode }: { mode: AuthMode }) {
  const isSignIn = mode === "signin";

  return (
    <main className="relative flex-1">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(88,101,242,0.12),transparent_60%)]"
      />

      <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
        <Link
          href="/"
          className="mx-auto flex items-center justify-center transition-opacity hover:opacity-80"
        >
          <Image
            src="/pcmart.png"
            alt="Pcmart"
            width={497}
            height={141}
            priority
            className="h-9 w-auto"
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

        <div className="mt-8 rounded-2xl border border-[#dce3ee] bg-[#eaf0f8] p-5 sm:p-7">
          <AuthForm mode={mode} />
        </div>

        <p className="mt-6 text-center text-sm text-[#5c5e66]">
          {isSignIn ? "New to Pcmart?" : "Already have an account?"}{" "}
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
