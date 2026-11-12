import type { Metadata } from "next";
import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Sign in | Pcmart",
  description:
    "Sign in to track orders, saved builds and lifetime support on your Pcmart machines.",
};

const gridMask =
  "linear-gradient(to right, transparent 0%, black 55%, black 100%)";

export default function LoginPage() {
  return (
    <main className="relative flex-1">
      <section className="relative overflow-hidden border-b border-[#dce3ee] bg-[#f0f4fa]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: gridMask,
            WebkitMaskImage: gridMask,
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#5865F2]/15 blur-3xl"
        />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_480px] lg:items-center lg:gap-16 lg:px-8 lg:py-16">
          <div data-reveal="up" className="max-w-xl">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 text-sm font-medium text-[#5c5e66]"
            >
              <Link href="/" className="transition-colors hover:text-[#5865F2]">
                Home
              </Link>
              <span aria-hidden="true" className="text-[#80848e]">
                /
              </span>
              <span className="text-[#2e3338]">Account</span>
            </nav>

            <div className="mt-8 flex items-center gap-3">
              <span className="h-px w-10 bg-gradient-to-r from-[#5865F2] to-transparent" />
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#5865F2]">
                Pcmart account
              </p>
            </div>

            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-balance text-[#2e3338] sm:text-5xl lg:text-6xl">
              YOUR WORKSHOP,
              <br />
              ONE LOGIN AWAY
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-[#5c5e66]">
              Sign in to track every build, prebuild and accessory you have
              ordered — and pick up exactly where you left off configuring your
              next machine.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#d2dbe8] bg-[#f8fafe] px-3 py-1.5 text-xs font-semibold text-[#4e5058]">
                Order tracking
              </span>
              <span className="rounded-full border border-[#d2dbe8] bg-[#f8fafe] px-3 py-1.5 text-xs font-semibold text-[#4e5058]">
                Saved builds
              </span>
              <span className="rounded-full border border-[#d2dbe8] bg-[#f8fafe] px-3 py-1.5 text-xs font-semibold text-[#4e5058]">
                Lifetime support
              </span>
            </div>
          </div>

          <div data-reveal="up" style={{ animationDelay: "120ms" }}>
            <AuthForm />
          </div>
        </div>
      </section>
    </main>
  );
}
